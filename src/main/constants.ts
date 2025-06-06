export const IPC = {
  WINDOW: {
    ACTION: 'window-action',
    DIFF_WINDOWS: 'open-diff-in-new-window',
    SHOW_LOG: 'show-log',
    CHECK_CODING_RULES: 'check-coding-rules',
    SPOTBUGS: 'spotbugs',
    COMMIT_MESSAGE_HISTORY: 'commit-message-history',
    MERGE_SVN: 'merge-svn',
  },
  SETTING: {
    APPEARANCE: {
      SET: 'setting:appearance:set',
    },
    CONFIGURATION: {
      GET: 'setting:configuration:get',
      SET: 'setting:configuration:set',
    },
    MAIL_SERVER: {
      GET: 'setting:mail-server:get',
      SET: 'setting:mail-server:set',
    },
    WEBHOOK: {
      GET: 'setting:webhook:get',
      SET: 'setting:webhook:set',
    },
    CODING_RULE: {
      GET: 'setting:coding-rule:get',
      SET: 'setting:coding-rule:set',
    },
  },
  SVN: {
    CHANGED_FILES: 'svn:changed-files',
    GET_DIFF: 'svn:get-diff',
    OPEN_DIFF: 'svn:open-diff',
    FIND_USER: 'svn:find-user',
    COMMIT: 'svn:commit',
    INFO: 'svn:info',
    CAT: 'svn:cat',
    BLAME: 'svn:blame',
    REVERT: 'svn:revert',
    CLEANUP: 'svn:cleanup',
    LOG: 'svn:log',
    UPDATE: 'svn:update',
    STATISTICS: 'svn:statistics',
    MERGE: 'svn:merge',
    MERGE_RESOLVE_CONFLICT: 'svn:merge-resolve-conflict',
    MERGE_CREATE_SNAPSHOT: 'svn:merge-create-snapshot',
    MERGE_GET_COMMITS: 'svn:merge-get-commits',
  },
  OPENAI: {
    SEND_MESSAGE: 'openai:send-message',
  },
  NOTIFICATIONS: {
    SEND_MAIL: 'notification:send-mail',
    SEND_TEAMS: 'notification:send-teams',
    SEND_SUPPORT_FEEDBACK: 'notification:send-support-feedback',
  },
  SYSTEM: {
    OPEN_FOLDER: 'system:open-folder',
    REVEAL_IN_FILE_EXPLORER: 'system:reveal-in-file-explorer',
    READ_FILE: 'system:read-file',
    WRITE_FILE: 'system:write-file',
  },
  UPDATER: {
    CHECK_FOR_UPDATES: 'updater:check-for-updates',
    INSTALL_UPDATES: 'updater:install-updates',
    GET_VERSION: 'updater:get-version',
    STATUS: 'updater:status',
  },
  HISTORY: {
    GET: 'history:get',
    SET: 'history:set',
  },
}

export const PROMPT = {
  CHECK_VIOLATIONS: `
Formatting re-enabled.

You are a senior code quality auditor and language standards specialist. Your role is to rigorously evaluate source code changes for compliance with industry-recognized best practices and language-specific conventions.

Apply these coding rules:
{coding_rules}

The results will be returned in table format, include 6 columns:
  1. No - Sequential index of each rule check.
  2. Criterion – The name or description of the coding rule being evaluated.
  3. Result – Whether the rule is followed (Pass or Fail).
  4. Violation Summary – A brief description of the rule violation, if any.
  5. Explanation – A short explanation of why it is considered a violation.
  6. Offending Code – The exact snippet of code where the violation occurs with line number.

The table will evaluate and reflect all criteria explicitly defined in the coding rules above.
All individual criteria will be listed and assessed separately.
Use this format to present all rule checks clearly.

Evaluate the following diff:
{diff_content}

Only the lines prefixed with '+' (i.e.new lines, edit line) need to be evaluated.

Respond strictly in {language}.
`,

  GENERATE_COMMIT: `
You are a source code management expert. Generate a professional commit message using the Conventional Commit Specification.

Write a general summary only, no need for detailed explanation.

Split the message into Frontend and Backend sections. If any part is missing, then there is no need to mention Frontend or Backend.

Based on this diff:
{diff_content}

Deleted Files:
{deletedFiles}

Respond strictly in {language}, without using Markdown formatting.
`,
}

/** List of text file extensions */
export const TEXT_EXTENSIONS = [
  'sample',
  'Dockerfile',
  'Makefile',
  'Rakefile',
  'ada',
  'adb',
  'ads',
  'applescript',
  'as',
  'ascx',
  'asm',
  'asmx',
  'asp',
  'aspx',
  'atom',
  'bas',
  'bash',
  'bashrc',
  'bat',
  'bbcolors',
  'bdsgroup',
  'bdsproj',
  'bib',
  'bowerrc',
  'c',
  'cbl',
  'cc',
  'cfc',
  'cfg',
  'cfm',
  'cfml',
  'cgi',
  'clj',
  'cls',
  'cmake',
  'cmd',
  'cnf',
  'cob',
  'coffee',
  'coffeekup',
  'conf',
  'cpp',
  'cpt',
  'cpy',
  'crt',
  'cs',
  'csh',
  'cson',
  'csr',
  'css',
  'csslintrc',
  'csv',
  'ctl',
  'curlrc',
  'cxx',
  'dart',
  'dfm',
  'diff',
  'dockerignore',
  'dof',
  'dpk',
  'dproj',
  'dtd',
  'eco',
  'editorconfig',
  'ejs',
  'el',
  'emacs',
  'eml',
  'ent',
  'erb',
  'erl',
  'eslintignore',
  'eslintrc',
  'ex',
  'exs',
  'f',
  'f03',
  'f77',
  'f90',
  'f95',
  'fish',
  'for',
  'fpp',
  'frm',
  'ftn',
  'gemrc',
  'gitattributes',
  'gitconfig',
  'gitignore',
  'gitkeep',
  'gitmodules',
  'go',
  'gpp',
  'gradle',
  'groovy',
  'groupproj',
  'grunit',
  'gtmpl',
  'gvimrc',
  'h',
  'haml',
  'hbs',
  'hgignore',
  'hh',
  'hpp',
  'hrl',
  'hs',
  'hta',
  'htaccess',
  'htc',
  'htm',
  'html',
  'htpasswd',
  'hxx',
  'iced',
  'inc',
  'ini',
  'ino',
  'int',
  'irbrc',
  'itcl',
  'itermcolors',
  'itk',
  'jade',
  'java',
  'jhtm',
  'jhtml',
  'js',
  'jscsrc',
  'jshintignore',
  'jshintrc',
  'json',
  'json5',
  'jsonld',
  'jsp',
  'jspx',
  'jsx',
  'ksh',
  'less',
  'lhs',
  'lisp',
  'log',
  'ls',
  'lsp',
  'lua',
  'm',
  'mak',
  'map',
  'markdown',
  'master',
  'md',
  'mdown',
  'mdwn',
  'mdx',
  'metadata',
  'mht',
  'mhtml',
  'mjs',
  'mk',
  'mkd',
  'mkdn',
  'mkdown',
  'ml',
  'mli',
  'mm',
  'mxml',
  'nfm',
  'nfo',
  'njk',
  'noon',
  'npmignore',
  'npmrc',
  'nvmrc',
  'ops',
  'pas',
  'pasm',
  'patch',
  'pbxproj',
  'pch',
  'pem',
  'pg',
  'php',
  'php3',
  'php4',
  'php5',
  'phpt',
  'phtml',
  'pir',
  'pl',
  'pm',
  'pmc',
  'pod',
  'pot',
  'properties',
  'props',
  'pt',
  'pug',
  'py',
  'r',
  'rake',
  'rb',
  'rdoc',
  'rdoc_options',
  'resx',
  'rhtml',
  'rjs',
  'rlib',
  'rmd',
  'ron',
  'rs',
  'rss',
  'rst',
  'rtf',
  'rvmrc',
  'rxml',
  's',
  'sass',
  'scala',
  'scm',
  'scss',
  'seestyle',
  'sh',
  'shtml',
  'sls',
  'spec',
  'sql',
  'sqlite',
  'ss',
  'sss',
  'st',
  'strings',
  'sty',
  'styl',
  'stylus',
  'sub',
  'sublime-build',
  'sublime-commands',
  'sublime-completions',
  'sublime-keymap',
  'sublime-macro',
  'sublime-menu',
  'sublime-project',
  'sublime-settings',
  'sublime-workspace',
  'sv',
  'svc',
  'svg',
  't',
  'tcl',
  'tcsh',
  'terminal',
  'tex',
  'text',
  'textile',
  'tg',
  'tmLanguage',
  'tmTheme',
  'tmpl',
  'toml',
  'tpl',
  'ts',
  'tsv',
  'tsx',
  'tt',
  'tt2',
  'ttml',
  'txt',
  'v',
  'vb',
  'vbs',
  'vh',
  'vhd',
  'vhdl',
  'vim',
  'viminfo',
  'vimrc',
  'vue',
  'webapp',
  'wxml',
  'wxss',
  'x-php',
  'xaml',
  'xht',
  'xhtml',
  'xml',
  'xs',
  'xsd',
  'xsl',
  'xslt',
  'yaml',
  'yml',
  'zsh',
  'zshrc',
]

/** List of binary file extensions */
export const BINARY_EXTENSIONS = ['dds', 'eot', 'gif', 'ico', 'jar', 'jpeg', 'jpg', 'pdf', 'png', 'swf', 'tga', 'ttf', 'zip']
