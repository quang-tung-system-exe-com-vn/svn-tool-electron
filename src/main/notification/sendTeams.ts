import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()
import configurationStore from '../store/ConfigurationStore'

export function createAdaptiveCard(data: CommitInfo) {
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
    const adaptiveCard = createAdaptiveCard(data)
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
