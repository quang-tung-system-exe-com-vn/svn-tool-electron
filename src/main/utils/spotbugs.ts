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

// Path to spotbugs directory
const getSpotBugsPath = () => {
  // In development mode, use the spotbugs directory in the project root
  if (process.env.NODE_ENV === 'development') {
    return path.resolve(process.cwd(), 'spotbugs-4.9.3')
  }

  // In production mode, use the spotbugs directory in the app resources
  return path.resolve(app.getAppPath(), '../spotbugs-4.9.3')
}

/**
 * Run SpotBugs on Java files
 * @param filePaths Array of Java file paths to analyze
 * @returns Promise with analysis results
 */
export async function runSpotBugs(filePaths: string[]): Promise<any> {
  try {
    // Filter only Java files
    const javaFiles = filePaths.filter(file => file.endsWith('.java'))

    if (javaFiles.length === 0) {
      return { status: 'error', message: 'No Java files to analyze' }
    }

    // Create temporary directories
    const tempDir = path.join(app.getPath('temp'), 'spotbugs-temp')
    const outputDir = path.join(tempDir, 'output')

    // Create directories if they don't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Convert relative paths to absolute paths
    const absolutePaths = javaFiles.map(file => path.resolve(sourceFolder, file))

    // Get the path to the spotbugs directory
    const spotbugsPath = getSpotBugsPath()

    // Path to the spotbugs executable
    const spotbugsExecutable = process.platform === 'win32'
      ? path.join(spotbugsPath, 'bin', 'spotbugs.bat')
      : path.join(spotbugsPath, 'bin', 'spotbugs')

    // Make sure the executable exists
    if (!fs.existsSync(spotbugsExecutable)) {
      return {
        status: 'error',
        message: `SpotBugs executable not found at: ${spotbugsExecutable}`
      }
    }

    // Output XML file
    const outputXml = path.join(outputDir, 'spotbugs-result.xml')

    log.info('Looking for corresponding class files for the selected Java files')

    // Try to find the project's base directory (where the .class files might be)
    // This is a heuristic approach - we'll try to find a common parent directory
    let projectBaseDir = sourceFolder

    // Extract the first file's directory path components
    if (absolutePaths.length > 0) {
      const firstFilePath = absolutePaths[0]
      const firstFileDir = path.dirname(firstFilePath)

      // Try to find 'src' or 'java' in the path to determine project root
      const pathParts = firstFileDir.split(path.sep)
      const srcIndex = pathParts.findIndex(part => part === 'src' || part === 'java')

      if (srcIndex >= 0) {
        // Project root is likely before 'src' or 'java'
        projectBaseDir = pathParts.slice(0, srcIndex).join(path.sep)
      }
    }

    log.info(`Detected project base directory: ${projectBaseDir}`)

    // Look for compiled class files in the project
    const possibleClassDirs = [
      // Standard Maven/Gradle structure
      path.join(projectBaseDir, 'target', 'classes'),
      path.join(projectBaseDir, 'build', 'classes'),
      path.join(projectBaseDir, 'build', 'classes', 'java', 'main'),
      // Eclipse structure
      path.join(projectBaseDir, 'bin'),
      // IntelliJ structure
      path.join(projectBaseDir, 'out', 'production'),
      // Other common locations
      path.join(projectBaseDir, 'classes'),
      path.join(projectBaseDir, 'build'),
      path.join(projectBaseDir, 'target'),
      // Try the source folder itself (might contain .class files)
      sourceFolder
    ]

    let classDir = ''
    let foundClassFiles = false
    const classFilePaths: string[] = []

    // First, try to find the class directory
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

    // Now, try to find the corresponding class files for each Java file
    for (const javaFilePath of absolutePaths) {
      const javaFileName = path.basename(javaFilePath, '.java')
      const packageMatch = fs.readFileSync(javaFilePath, 'utf-8').match(/package\s+([^;]+);/)
      const packageName = packageMatch ? packageMatch[1] : ''

      let classFilePath = ''

      if (packageName) {
        // If we have a package name, construct the expected class file path
        const packagePath = packageName.replace(/\./g, path.sep)
        classFilePath = path.join(classDir, packagePath, `${javaFileName}.class`)
      } else {
        // If no package, try to find the class file directly
        classFilePath = path.join(classDir, `${javaFileName}.class`)
      }

      if (fs.existsSync(classFilePath)) {
        log.info(`Found class file for ${javaFileName}: ${classFilePath}`)
        classFilePaths.push(classFilePath)
        foundClassFiles = true
      } else {
        // If not found directly, try to search for it
        log.info(`Searching for ${javaFileName}.class in ${classDir}...`)

        // Recursive function to find class files
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

    // Create a temporary file with the list of class files to analyze
    const classFileListPath = path.join(tempDir, 'class-files-to-analyze.txt')
    fs.writeFileSync(classFileListPath, classFilePaths.join('\n'))

    log.info(`Running SpotBugs on ${classFilePaths.length} class files`)

    // Build the SpotBugs command to analyze the class files
    const command = `"${spotbugsExecutable}" -textui -xml:withMessages -output "${outputXml}" -sourcepath "${sourceFolder}" -nested:true -low ${classFilePaths.map(file => `"${file}"`).join(' ')}`

    log.info('Running SpotBugs command:', command)

    // Execute the command
    const { stdout, stderr } = await execPromise(command)

    if (stderr) {
      log.error('SpotBugs stderr:', stderr)
    }

    log.info('SpotBugs stdout:', stdout)

    // Check if the output file was created
    if (!fs.existsSync(outputXml)) {
      return {
        status: 'error',
        message: 'SpotBugs analysis failed to generate output file'
      }
    }

    // Read the XML output
    const xmlContent = fs.readFileSync(outputXml, 'utf-8')
    log.info(xmlContent)

    // Clean up temporary files (optional - can be commented out for debugging)
    // fs.rmSync(tempDir, { recursive: true, force: true })

    // Add a note about the analysis method
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
    console.log(bugCollection)

    if (!bugCollection) {
      throw new Error('Missing BugCollection root element');
    }


    // Trích xuất bugCategories
    const bugCategories: Record<string, string> = {};
    const bugCategoryList = Array.isArray(bugCollection.BugCategory)
      ? bugCollection.BugCategory
      : [bugCollection.BugCategory];

    for (const category of bugCategoryList) {
      const { category: categoryName, Description } = category;
      bugCategories[categoryName] = Description;
    }
    console.log(`Found ${Object.keys(bugCategories).length} bug categories`);

    // Trích xuất bugPatterns
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

    // Trích xuất thông tin về bug instances
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
        LongMessage
      } = bugInstance;

      const id = instanceHash || `BUG-${index + 1}`;

      // Trích xuất thông tin từ Method
      const methodName = Method?.name || 'unknown';
      const signature = Method?.signature || '()V';

      // Trích xuất thông tin từ Class
      const className = Class?.classname || 'unknown';
      const sourceFile = Class?.SourceLine?.sourcefile || 'unknown';
      const startLine = SourceLine?.start || 0;
      const endLine = SourceLine?.end || 0;

      // Trích xuất thông điệp ngắn và dài
      const shortMessage = ShortMessage || bugPatterns[type]?.shortDescription || type;
      const longMessage = LongMessage || '';

      // Đánh giá mức độ nghiêm trọng dựa trên priority
      let severity: 'High' | 'Medium' | 'Low' = 'Medium';
      if (Number.parseInt(priority) === 1) severity = 'High';
      else if (Number.parseInt(priority) >= 3) severity = 'Low';

      // Thêm bug instance vào danh sách
      bugInstances.push({
        id,
        type,
        category: category || type.split('_')[0],
        priority: Number.parseInt(priority),
        rank: Number.parseInt(rank),
        className,
        methodName,
        signature,
        sourceFile,
        startLine,
        endLine,
        message: shortMessage,
        longMessage,
        details: bugPatterns[type]?.details || '',
        severity,
        categoryDescription: bugCategories[category || type.split('_')[0]] || ''
      });
    });

    console.log(`Found ${bugInstances.length} bug instances`);

    // Trích xuất thông tin dự án
    const projectName = bugCollection.Project?.projectName || '';

    // Trích xuất thông tin tổng quan
    const summary = bugCollection.FindBugsSummary || {};
    const timestamp = summary.timestamp || '';
    const totalClasses = Number.parseInt(summary.total_classes) || 0;
    const totalBugs = Number.parseInt(summary.total_bugs) || bugInstances.length;
    const priority1 = Number.parseInt(summary.priority_1) || 0;
    const priority2 = Number.parseInt(summary.priority_2) || 0;
    const priority3 = Number.parseInt(summary.priority_3) || 0;

    // Đếm các bug theo mức độ nghiêm trọng
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
