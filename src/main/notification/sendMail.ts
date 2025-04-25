import log from 'electron-log'
import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import configurationStore from '../store/ConfigurationStore'
import mailServerStore from '../store/MailServerStore'

export async function sendMail(data: CommitInfo): Promise<void> {
  try {
    const { commitUser, commitTime, commitMessage, violations, addedFiles, modifiedFiles, deletedFiles } = data
    log.info('🎯 Sending HTML email...')
    const { emailPL } = configurationStore.store
    const { smtpServer, port, email, password } = mailServerStore.store
    const addedFilesHtml = `<ul>${addedFiles.map(file => `<li>${file}</li>`).join('')}</ul>`
    const modifiedFilesHtml = `<ul>${modifiedFiles.map(file => `<li>${file}</li>`).join('')}</ul>`
    const deletedFilesHtml = `<ul>${deletedFiles.map(file => `<li>${file}</li>`).join('')}</ul>`

    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>SVN Commit Notification</title>
          <style>
            body {
              font-family: 'Roboto', Arial, sans-serif;
              background-color: #f4f4f4;
              font-size: .9rem;
              padding: 20px;
            }
            .container {
              margin: 0 auto;
              background-color: #fff;
              border-radius: 5px;
              box-shadow: 0 0 10px rgba(0, 0, 0, .1);
              padding: 20px;
            }
            p {
              line-height: 1;
              margin-bottom: 2px;
            }
            ul {
              padding-left: 20px;
              margin: 0 !important;
              list-style-type: auto;
            }
            pre {
              background: #ffffca !important;
              margin-top: 5px;
              margin-bottom: 10px;
              padding: 10px;
              border-radius: 5px;
              font-family: Calibri;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>SVN Commit Notification</h2>
            <p><b>Commit User:</b> ${commitUser}</p>
            <p><b>Commit Time:</b> ${commitTime}</p>
            <p><b>Commit Message:</b></p>
            <pre>${commitMessage}</pre>
            <p><b>Coding Rule Violations:</b></p>
            <pre>${violations}</pre>
            ${addedFiles.length > 0 ? `<p style="color: #28A745;"><b>Added Files (${addedFiles.length}):</b></p><pre style="white-space: normal !important">${addedFilesHtml}</pre>` : ''}
            ${modifiedFiles.length > 0 ? `<p style="color: #007BFF;"><b>Modified Files (${modifiedFiles.length}):</b></p><pre style="white-space: normal !important">${modifiedFilesHtml}</pre>` : ''}
            ${deletedFiles.length > 0 ? `<p style="color: #DC3545;"><b>Deleted Files (${deletedFiles.length}):</b></p><pre style="white-space: normal !important">${deletedFilesHtml}</pre>` : ''}
          </div>
        </body>
      </html>
    `

    const smtpOptions: SMTPTransport.Options = {
      host: smtpServer,
      port: Number(port),
      secure: false,
      auth: {
        user: email,
        pass: password,
      },
    }

    const transporter = nodemailer.createTransport(smtpOptions)
    await transporter.sendMail({
      from: email,
      to: emailPL,
      subject: 'SVN Commit Notification',
      html: htmlContent,
    })

    log.info(`✅ Email sent to ${emailPL} successfully!`)
  } catch (error) {
    log.error(`Error sending email: ${error}`)
  }
}
