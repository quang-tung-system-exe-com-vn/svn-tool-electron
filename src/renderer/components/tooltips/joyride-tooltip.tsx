import { useButtonVariant } from '@/stores/useAppearanceStore'
import { useTranslation } from 'react-i18next'
import type { TooltipRenderProps } from 'react-joyride'
import { Button } from '../ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card'

export const JoyrideTooltip = ({ index, step, size, backProps, closeProps, primaryProps, skipProps, tooltipProps, isLastStep, continuous }: TooltipRenderProps) => {
  const { t } = useTranslation()
  const variant = useButtonVariant()

  return (
    <Card {...tooltipProps} className="rounded-md bg-card text-card-foreground shadow-lg w-[320px] border-none">
      <CardHeader className="flex flex-row items-center justify-between text-base font-semibold px-4 pt-1">
        <div className="rounded-md border px-2.5 py-1.25 fg-primary">
          {step.title || `${index + 1}`} / {size}
        </div>
        <div className="flex items-center space-x-2">
          {/* Skip Button */}
          {skipProps && (
            <Button variant={variant} size="sm" {...skipProps} className="text-muted-foreground">
              {t('common.skip')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-sm px-4">{step.content}</CardContent>
      <CardFooter className="flex items-center justify-between px-4 py-1 border-t">
        <div>
          {index > 0 && (
            <Button variant={variant} size="sm" {...backProps} className="text-muted-foreground">
              {t('common.back')}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant={variant} size="sm" {...primaryProps}>
            {isLastStep ? t('common.finish') : continuous ? t('common.next') : 'OK'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
