import axios from 'axios'
import { app } from 'electron'
import os from 'node:os'
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
  console.log('✅ Adaptive card created!')
  return baseCard
}

export async function sendTeams(data: CommitInfo): Promise<void> {
  try {
    console.log('🎯 Sending card to MS Teams...')
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
      console.log('✅ Adaptive card sent to MS Teams successfully!')
    } else {
      console.log(`Failed to send adaptive card to MS Teams: ${response.status}`, 'error')
    }
  } catch (err) {
    console.log(`Error sending adaptive card: ${err}`, 'error')
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
    imageUrls.forEach((imageUrl, index) => {
      bodyElements.push({
        type: 'Image',
        url: imageUrl,
        size: 'Medium',
        altText: `Image ${index + 1}`,
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
    console.log('🎯 Sending Support/Feedback card to MS Teams...')
    const { webhookMS, oneDriveClientId, oneDriveRefreshToken } = configurationStore.store

    if (!webhookMS) {
      console.error('MS Teams Webhook URL is not configured.')
      return { success: false, error: 'MS Teams Webhook URL is not configured.' }
    }

    let imageUrls: string[] = []
    if (data.images && data.images.length > 0) {
      try {
        console.log(oneDriveRefreshToken);
        if (!oneDriveClientId || !oneDriveRefreshToken) {
          console.warn('OneDrive is not fully configured. Images will be skipped.')
          return { success: false, error: 'OneDrive chưa được cấu hình đầy đủ. Vui lòng kiểm tra Client ID và Refresh Token trong phần cài đặt OneDrive.' }
        }
        console.log(`Uploading ${data.images.length} images to OneDrive...`)
        imageUrls = await uploadImagesToOneDrive(data.images)
        console.log(`Successfully uploaded ${imageUrls.length} images to OneDrive`)
      } catch (uploadError: any) {
        console.error('Error uploading images to OneDrive:', uploadError)
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
      console.log('✅ Support/Feedback card sent to MS Teams successfully!')
      return { success: true }
    }
    console.error(`Failed to send Support/Feedback card to MS Teams: ${response.status}`)
    return { success: false, error: `Failed to send message (Status: ${response.status})` }
  } catch (err: any) {
    console.error(`Error sending Support/Feedback card: ${err.message}`)
    return { success: false, error: err.message || 'An unknown error occurred' }
  }
}
