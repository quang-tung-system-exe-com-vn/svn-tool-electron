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
  },
  DIALOG: {
    OPEN_FOLDER: 'dialog:open-folder',
  },
}
