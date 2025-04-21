import { app } from 'electron'
import log from 'electron-log'
import { XMLParser } from 'fast-xml-parser'
import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import configurationStore from '../store/ConfigurationStore'

const execPromise = promisify(exec)
const { sourceFolder } = configurationStore.store
const getSpotBugsPath = () => {
  if (process.env.NODE_ENV === 'development') {
    return path.resolve(process.cwd(), 'spotbugs-4.9.3')
  }
  return path.resolve(app.getAppPath(), '../spotbugs-4.9.3')
}

/**
 * Run SpotBugs on Java files
 * @param filePaths Array of Java file paths to analyze
 * @returns Promise with analysis results
 */
export async function runSpotBugs(filePaths: string[]): Promise<any> {
  try {
    const javaFiles = filePaths.filter(file => file.endsWith('.java'))
    if (javaFiles.length === 0) {
      return { status: 'error', message: 'No Java files to analyze' }
    }
    const tempDir = path.join(app.getPath('temp'), 'spotbugs-temp')
    const outputDir = path.join(tempDir, 'output')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    const absolutePaths = javaFiles.map(file => path.resolve(sourceFolder, file))
    const spotbugsPath = getSpotBugsPath()
    const spotbugsExecutable = process.platform === 'win32'
      ? path.join(spotbugsPath, 'bin', 'spotbugs.bat')
      : path.join(spotbugsPath, 'bin', 'spotbugs')
    if (!fs.existsSync(spotbugsExecutable)) {
      return {
        status: 'error',
        message: `SpotBugs executable not found at: ${spotbugsExecutable}`
      }
    }
    const outputXml = path.join(outputDir, 'spotbugs-result.xml')
    log.info('Looking for corresponding class files for the selected Java files')
    let projectBaseDir = sourceFolder
    if (absolutePaths.length > 0) {
      const firstFilePath = absolutePaths[0]
      const firstFileDir = path.dirname(firstFilePath)
      const pathParts = firstFileDir.split(path.sep)
      const srcIndex = pathParts.findIndex(part => part === 'src' || part === 'java')
      if (srcIndex >= 0) {
        projectBaseDir = pathParts.slice(0, srcIndex).join(path.sep)
      }
    }
    log.info(`Detected project base directory: ${projectBaseDir}`)
    const possibleClassDirs = [
      path.join(projectBaseDir, 'target', 'classes'),
      path.join(projectBaseDir, 'build', 'classes'),
      path.join(projectBaseDir, 'build', 'classes', 'java', 'main'),
      path.join(projectBaseDir, 'bin'),
      path.join(projectBaseDir, 'out', 'production'),
      path.join(projectBaseDir, 'classes'),
      path.join(projectBaseDir, 'build'),
      path.join(projectBaseDir, 'target'),
      sourceFolder
    ]
    let classDir = ''
    let foundClassFiles = false
    const classFilePaths: string[] = []
    for (const dir of possibleClassDirs) {
      if (fs.existsSync(dir)) {
        log.info(`Found potential class directory: ${dir}`)
        classDir = dir
        break
      }
    }
    if (!classDir) {
      log.warn('Could not find any class directory')
      return {
        status: 'error',
        message: 'Could not find any class directory. Please make sure your project is compiled.'
      }
    }
    for (const javaFilePath of absolutePaths) {
      const javaFileName = path.basename(javaFilePath, '.java')
      const packageMatch = fs.readFileSync(javaFilePath, 'utf-8').match(/package\s+([^;]+);/)
      const packageName = packageMatch ? packageMatch[1] : ''
      let classFilePath = ''
      if (packageName) {
        const packagePath = packageName.replace(/\./g, path.sep)
        classFilePath = path.join(classDir, packagePath, `${javaFileName}.class`)
      } else {
        classFilePath = path.join(classDir, `${javaFileName}.class`)
      }
      if (fs.existsSync(classFilePath)) {
        log.info(`Found class file for ${javaFileName}: ${classFilePath}`)
        classFilePaths.push(classFilePath)
        foundClassFiles = true
      } else {
        log.info(`Searching for ${javaFileName}.class in ${classDir}...`)
        const findClassFile = (dir: string, className: string): string | null => {
          const files = fs.readdirSync(dir)
          for (const file of files) {
            const filePath = path.join(dir, file)
            const stat = fs.statSync(filePath)
            if (stat.isDirectory()) {
              const found = findClassFile(filePath, className)
              if (found) return found
            } else if (file === `${className}.class`) {
              return filePath
            }
          }
          return null
        }
        const foundClassFile = findClassFile(classDir, javaFileName)
        if (foundClassFile) {
          log.info(`Found class file for ${javaFileName}: ${foundClassFile}`)
          classFilePaths.push(foundClassFile)
          foundClassFiles = true
        } else {
          log.warn(`Could not find class file for ${javaFileName}`)
        }
      }
    }
    if (!foundClassFiles) {
      log.warn('Could not find any class files for the selected Java files')
      return {
        status: 'error',
        message: 'Could not find any class files for the selected Java files. Please make sure your project is compiled.'
      }
    }
    const classFileListPath = path.join(tempDir, 'class-files-to-analyze.txt')
    fs.writeFileSync(classFileListPath, classFilePaths.join('\n'))
    log.info(`Running SpotBugs on ${classFilePaths.length} class files`)
    const command = `"${spotbugsExecutable}" -textui -xml:withMessages -output "${outputXml}" -sourcepath "${sourceFolder}" -nested:true -low ${classFilePaths.map(file => `"${file}"`).join(' ')}`
    log.info('Running SpotBugs command:', command)
    const { stdout, stderr } = await execPromise(command)
    if (stderr) {
      log.error('SpotBugs stderr:', stderr)
    }
    log.info('SpotBugs stdout:', stdout)
    if (!fs.existsSync(outputXml)) {
      return {
        status: 'error',
        message: 'SpotBugs analysis failed to generate output file'
      }
    }
    const xmlContent = fs.readFileSync(outputXml, 'utf-8')
    log.info(xmlContent)
    const note = `Note: SpotBugs analysis was performed on the compiled class files.
    This provides more accurate results than analyzing source files directly.`;
    log.info(note)
    return {
      status: 'success',
      data: xmlContent,
      analyzedFiles: javaFiles
    }
  } catch (error) {
    log.error('Error running SpotBugs:', error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    }
  }
}
/**
 * Parse SpotBugs XML result into a more usable format
 * @param xmlContent SpotBugs XML output
 * @returns Parsed bug instances
 */
export function parseSpotBugsResult(xmlContent: string): any {
  try {
    console.log("Parsing SpotBugs XML result...");
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseTagValue: false,
      parseAttributeValue: true,
      allowBooleanAttributes: true,
      trimValues: true,
    });
    const jsonObj = parser.parse(xmlContent);
    const bugCollection = jsonObj?.BugCollection;
    console.log(bugCollection);
    if (!bugCollection) {
      throw new Error('Missing BugCollection root element');
    }

    const bugCategories: Record<string, string> = {};
    const bugCategoryList = Array.isArray(bugCollection.BugCategory)
      ? bugCollection.BugCategory
      : [bugCollection.BugCategory];
    for (const category of bugCategoryList) {
      const { category: categoryName, Description } = category;
      bugCategories[categoryName] = Description;
    }
    console.log(`Found ${Object.keys(bugCategories).length} bug categories`);

    const bugPatterns: Record<string, any> = {};
    const bugPatternList = Array.isArray(bugCollection.BugPattern)
      ? bugCollection.BugPattern
      : [bugCollection.BugPattern];
    for (const bugPattern of bugPatternList) {
      const { type, ShortDescription, Details } = bugPattern;
      const details = Details?.['#text'] || Details?.CDATA || Details || '';
      bugPatterns[type] = {
        type,
        shortDescription: ShortDescription,
        details: details.trim?.() || '',
      };
    }
    console.log(`Found ${Object.keys(bugPatterns).length} bug patterns`);

    const bugInstances: any[] = [];
    const bugInstanceList = bugCollection.BugInstance || [];
    bugInstanceList.forEach((bugInstance: any, index: number) => {
      const {
        type,
        priority,
        rank,
        instanceHash,
        category,
        Method,
        Class,
        SourceLine,
        ShortMessage,
        LongMessage,
        LocalVariable,
        Property
      } = bugInstance;

      const id = instanceHash || `BUG-${index + 1}`;
      const methodName = Method?.name || 'unknown';
      const signature = Method?.signature || '()V';
      const isStatic = Method?.isStatic === 'true';
      const isPrimary = Method?.primary === 'true';

      // Trích xuất thông tin SourceLine từ Method
      const methodSourceLine = Method?.SourceLine || {};
      const methodStartLine = methodSourceLine?.start || 0;
      const methodEndLine = methodSourceLine?.end || 0;
      const methodStartBytecode = methodSourceLine?.startBytecode || 0;
      const methodEndBytecode = methodSourceLine?.endBytecode || 0;

      // Trích xuất thông tin Message từ Method
      const methodMessage = Method?.Message || '';

      const className = Class?.classname || 'unknown';
      const sourceFile = Class?.SourceLine?.sourcefile || 'unknown';
      const startLine = SourceLine?.start || 0;
      const endLine = SourceLine?.end || 0;
      const shortMessage = ShortMessage || bugPatterns[type]?.shortDescription || type;
      const longMessage = LongMessage || '';
      let severity: 'High' | 'Medium' | 'Low' = 'Medium';

      if (Number.parseInt(priority) === 1) severity = 'High';
      else if (Number.parseInt(priority) >= 3) severity = 'Low';

      // Local Variable and Property extraction
      const localVariableList = LocalVariable ? (Array.isArray(LocalVariable)
        ? LocalVariable
        : [LocalVariable]) : [];
      const localVariables = localVariableList.map((lv: any) => ({
        name: lv?.name,
        message: lv?.Message,
      }));

      const propertyList = Property ? (Array.isArray(Property)
        ? Property
        : [Property]) : [];
      const properties = propertyList.map((p: any) => ({
        name: p?.name,
        value: p?.value,
      }));

      bugInstances.push({
        id,
        type,
        category: category || type.split('_')[0],
        priority: Number.parseInt(priority),
        rank: Number.parseInt(rank),
        className,
        methodName,
        signature,
        isStatic,
        isPrimary,
        methodInfo: {
          startLine: methodStartLine,
          endLine: methodEndLine,
          startBytecode: methodStartBytecode,
          endBytecode: methodEndBytecode,
          message: methodMessage
        },
        sourceFile,
        startLine,
        endLine,
        message: shortMessage,
        longMessage,
        details: bugPatterns[type]?.details || '',
        severity,
        categoryDescription: bugCategories[category || type.split('_')[0]] || '',
        localVariables,
        properties
      });
    });

    console.log(`Found ${bugInstances.length} bug instances`);

    const projectName = bugCollection.Project?.projectName || '';
    const summary = bugCollection.FindBugsSummary || {};
    const timestamp = summary.timestamp || '';
    const totalClasses = Number.parseInt(summary.total_classes) || 0;
    const totalBugs = Number.parseInt(summary.total_bugs) || bugInstances.length;
    const priority1 = Number.parseInt(summary.priority_1) || 0;
    const priority2 = Number.parseInt(summary.priority_2) || 0;
    const priority3 = Number.parseInt(summary.priority_3) || 0;
    const high = bugInstances.filter(bug => bug.severity === 'High').length;
    const medium = bugInstances.filter(bug => bug.severity === 'Medium').length;
    const low = bugInstances.filter(bug => bug.severity === 'Low').length;

    const result = {
      projectName,
      timestamp,
      totalClasses,
      totalBugs,
      bugsBySeverity: {
        high: high || priority1,
        medium: medium || priority2,
        low: low || priority3
      },
      bugPatterns,
      bugCategories,
      bugInstances
    };

    console.log(`Analysis complete. Found ${result.totalBugs} bugs.`);
    return result;
  } catch (error) {
    log.error('Error parsing SpotBugs result:', error);
    return {
      totalBugs: 0,
      bugsBySeverity: {
        high: 0,
        medium: 0,
        low: 0
      },
      bugInstances: []
    };
  }
}
