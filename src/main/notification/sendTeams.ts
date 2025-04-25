import { randomUUID } from 'node:crypto'
import os from 'node:os'
import axios from 'axios'
import { app } from 'electron'
import log from 'electron-log'
import configurationStore from '../store/ConfigurationStore'
import { uploadImagesToOneDrive } from '../utils/oneDriveUploader'

function createCommitInfoCard(data: CommitInfo) {
  const { commitUser, commitTime, commitMessage, violations, addedFiles, modifiedFiles, deletedFiles } = data
  const baseCard: any = {
    $schema: 'https://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.5',
    msteams: { width: 'Full' },
    body: [
      {
        type: 'FactSet',
        facts: [
          { title: 'Commit User', value: commitUser },
          { title: 'Commit Time', value: commitTime },
        ],
      },
    ],
    actions: [
      {
        type: 'Action.ShowCard',
        title: 'View Commit Message',
        iconUrl: 'icon:Textbox',
        card: {
          type: 'AdaptiveCard',
          body: [
            {
              type: 'TextBlock',
              text: commitMessage.split('\n').join('\n\n'),
              wrap: true,
            },
          ],
        },
      },
      {
        type: 'Action.ShowCard',
        title: 'Coding Rule Violations',
        iconUrl: 'icon:TextGrammarCheckmark',
        card: {
          type: 'AdaptiveCard',
          body: [
            {
              type: 'TextBlock',
              text: violations.split('\n').join('\n\n'),
              wrap: true,
            },
          ],
        },
      },
      {
        type: 'Action.ShowCard',
        title: 'View Changed Files',
        iconUrl: 'icon:DocumentBulletList',
        card: {
          type: 'AdaptiveCard',
          body: [],
        },
      },
    ],
  }

  const changedFilesCard: any[] = []

  if (addedFiles.length > 0) {
    changedFilesCard.push({
      type: 'TextBlock',
      text: `### Added Files (${addedFiles.length}):`,
      weight: 'bolder',
      wrap: true,
      color: 'good',
    })
    changedFilesCard.push({
      type: 'Container',
      items: addedFiles.map((file, i) => ({
        type: 'TextBlock',
        text: `${i + 1}. ${file}`,
        wrap: true,
        spacing: 'None',
      })),
    })
  }

  if (modifiedFiles.length > 0) {
    changedFilesCard.push({
      type: 'TextBlock',
      text: `### Modified Files (${modifiedFiles.length}):`,
      weight: 'bolder',
      wrap: true,
      color: 'accent',
    })
    changedFilesCard.push({
      type: 'Container',
      items: modifiedFiles.map((file, i) => ({
        type: 'TextBlock',
        text: `${i + 1}. ${file}`,
        wrap: true,
        spacing: 'None',
      })),
    })
  }

  if (deletedFiles.length > 0) {
    changedFilesCard.push({
      type: 'TextBlock',
      text: `### Deleted Files (${deletedFiles.length}):`,
      weight: 'bolder',
      wrap: true,
      color: 'attention',
    })
    changedFilesCard.push({
      type: 'Container',
      items: deletedFiles.map((file, i) => ({
        type: 'TextBlock',
        text: `${i + 1}. ${file}`,
        wrap: true,
        spacing: 'None',
      })),
    })
  }

  baseCard.actions[2].card.body = changedFilesCard
  log.info('✅ Adaptive card created!')
  return baseCard
}

export async function sendTeams(data: CommitInfo): Promise<void> {
  try {
    log.info('🎯 Sending card to MS Teams...')
    const { webhookMS } = configurationStore.store
    const adaptiveCard = createCommitInfoCard(data)
    const payload = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: adaptiveCard,
        },
      ],
    }

    const response = await axios.post(webhookMS, payload, {
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.status < 300) {
      log.info('✅ Adaptive card sent to MS Teams successfully!')
    } else {
      log.error(`Failed to send adaptive card to MS Teams: ${response.status}`)
    }
  } catch (err) {
    log.error(`Error sending adaptive card: ${err}`)
  }
}

function createSupportFeedbackCard(data: SupportFeedback, imageUrls: string[] = []) {
  const { type, email, message } = data
  const cardType = type === 'support' ? 'Support Request' : 'Feedback Submission'
  const cardColor = type === 'support' ? 'warning' : 'accent'

  const bodyElements: any[] = [
    {
      type: 'TextBlock',
      text: `**${cardType}**`,
      size: 'Large',
      weight: 'Bolder',
      color: cardColor,
    },
    {
      type: 'FactSet',
      facts: [
        { title: 'From', value: email },
        { title: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1) },
        { title: 'Timestamp', value: new Date().toLocaleString() },
        { title: 'OS', value: `${os.type()} ${os.release()}` },
        { title: 'Username', value: os.userInfo().username },
        { title: 'Locale', value: Intl.DateTimeFormat().resolvedOptions().locale },
        { title: 'App Version', value: app.getVersion() },
      ],
      separator: true,
    },
    {
      type: 'TextBlock',
      text: '**Message:**',
      wrap: true,
    },
    {
      type: 'TextBlock',
      text: message,
      wrap: true,
    },
  ]

  if (imageUrls && imageUrls.length > 0) {
    bodyElements.push({
      type: 'TextBlock',
      text: '**Attached Images:**',
      wrap: true,
    })

    // Thay vì sử dụng thẻ Image, sử dụng TextBlock với URL dạng text
    imageUrls.forEach((imageUrl, index) => {
      bodyElements.push({
        type: 'TextBlock',
        text: `[Image ${index + 1}](${imageUrl})`,
        wrap: true,
        isSubtle: false,
      })
    })
  }

  return {
    $schema: 'https://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.5',
    msteams: { width: 'Full' },
    body: bodyElements,
  }
}

export async function sendSupportFeedbackToTeams(data: SupportFeedback): Promise<{ success: boolean; error?: string }> {
  try {
    log.info('🎯 Sending Support/Feedback card to MS Teams...')
    const { webhookMS, oneDriveClientId, oneDriveRefreshToken } = configurationStore.store

    if (!webhookMS) {
      log.error('MS Teams Webhook URL is not configured.')
      return { success: false, error: 'MS Teams Webhook URL is not configured.' }
    }

    let imageUrls: string[] = []
    if (data.images && data.images.length > 0) {
      try {
        if (!oneDriveClientId || !oneDriveRefreshToken) {
          log.warn('OneDrive is not fully configured. Images will be skipped.')
          return { success: false, error: 'OneDrive chưa được cấu hình đầy đủ. Vui lòng kiểm tra Client ID và Refresh Token trong phần cài đặt OneDrive.' }
        }

        // Tạo UUID cho feedback này
        const feedbackUuid = randomUUID()
        log.info(`Uploading ${data.images.length} images to OneDrive folder with UUID: ${feedbackUuid}...`)

        // Sử dụng UUID khi upload ảnh để tất cả ảnh được lưu trong cùng một thư mục
        imageUrls = await uploadImagesToOneDrive(data.images, feedbackUuid)
        log.info(`Successfully uploaded ${imageUrls.length} images to OneDrive`)
      } catch (uploadError: any) {
        log.error('Error uploading images to OneDrive:', uploadError)
      }
    }

    const adaptiveCard = createSupportFeedbackCard(data, imageUrls)
    const payload = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: adaptiveCard,
        },
      ],
    }

    const response = await axios.post(webhookMS, payload, {
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.status < 300) {
      log.info('✅ Support/Feedback card sent to MS Teams successfully!')
      return { success: true }
    }
    log.error(`Failed to send Support/Feedback card to MS Teams: ${response.status}`)
    return { success: false, error: `Failed to send message (Status: ${response.status})` }
  } catch (err: any) {
    log.error(`Error sending Support/Feedback card: ${err.message}`)
    return { success: false, error: err.message || 'An unknown error occurred' }
  }
}
