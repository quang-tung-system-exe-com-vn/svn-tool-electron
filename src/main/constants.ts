export const IPC = {
  WINDOW: {
    ACTION: 'window-action',
  },
  SETTING: {
    APPEARANCE: {
      GET: 'setting:appearance:get',
      SET: 'setting:appearance:set',
      HAS: 'setting:appearance:has',
      DELETE: 'setting:appearance:delete',
    },
    CONFIGURATION: {
      GET: 'setting:configuration:get',
      SET: 'setting:configuration:set',
    },
    MAIL_SERVER: {
      GET: 'setting:mail-server:get',
      SET: 'setting:mail-server:set',
    },
  },
  SVN: {
    GET_CHANGED_FILES: 'svn:get-changed-files',
    GET_SVN_DIFF: 'svn:get-svn-diff',
    GET_USER_SVN: 'svn:get_user_svn',
  },
  OPENAI: {
    SEND_MESSAGE: 'openai:send-message',
  },
  NOTIFICATIONS: {
    GET: 'notification:send_mail',
    SET: 'notification:send_msg',
  },
  DIALOG: {
    OPEN_FOLDER: 'dialog:open-folder',
  },
}

export const PROMPT = {
  CHECK_VIOLATIONS: `
Formatting re-enabled.
You are a source code management expert. Please apply the relevant coding rules for each line of code, such as Java rules for Java code, SQL rules for SQL code, and TypeScript rules for TypeScript code.
Here is the code. Lines starting with minus(-) are ignored.

{diff_content}

The lines being checked are part of a function or a file, so please review them accordingly.
Only summarize the violations; no need to explain them.
Briefly summarize the violations with Emoji in the above code and respond in {language} while keeping the variable names and function names unchanged (if any).
Provide the final conclusion starting with the symbol =>
`,

  GENERATE_COMMIT: `
You are a source code management expert. Generate a professional commit message using the Conventional Commit Specification with Emoji.
Split the message into Frontend and Backend sections. If any part is missing, then there is no need to mention Frontend or Backend.
Based on this diff:
{diff_content}

Respond in {language} but keep variable names and function names.
`,
}
