import chalk from 'chalk'
const customColors = {
  info: { background: '#1e3d8f', text: '#fff' }, // Nền xanh dương đậm, chữ sáng hơn
  success: { background: '#2d6a4f', text: '#fff' }, // Nền xanh lá đậm, chữ sáng hơn
  warning: { background: '#d47a14', text: '#fff' }, // Nền cam đậm, chữ sáng vàng
  error: { background: '#d94c4c', text: '#fff' }, // Nền đỏ đậm, chữ sáng hồng
  debug: { background: '#7a2a8c', text: '#fff' }, // Nền tím đậm, chữ sáng tím nhạt
}
class Logger {
  private isEnabled: boolean

  constructor() {
    this.isEnabled = true
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  private format(message: any): string {
    if (typeof message === 'object') {
      try {
        return JSON.stringify(message, null, 2)
      } catch {
        return '[Unserializable Object]'
      }
    }
    return String(message)
  }

  public info(message: any, ...optionalParams: any[]): void {
    if (!this.isEnabled) return
    console.log(chalk.bgHex(customColors.info.background).hex(customColors.info.text).bold('[INFO]'), this.format(message), ...optionalParams)
  }

  public success(message: any, ...optionalParams: any[]): void {
    if (!this.isEnabled) return
    console.log(chalk.bgHex(customColors.success.background).hex(customColors.success.text).bold('[SUCCESS]'), this.format(message), ...optionalParams)
  }

  public warning(message: any, ...optionalParams: any[]): void {
    if (!this.isEnabled) return
    console.log(chalk.bgHex(customColors.warning.background).hex(customColors.warning.text).bold('[WARNING]'), this.format(message), ...optionalParams)
  }

  public error(message: any, ...optionalParams: any[]): void {
    if (!this.isEnabled) return
    console.log(chalk.bgHex(customColors.error.background).hex(customColors.error.text).bold('[ERROR]'), this.format(message), ...optionalParams)
  }

  public debug(message: any, ...optionalParams: any[]): void {
    if (!this.isEnabled) return
    console.log(chalk.bgHex(customColors.debug.background).hex(customColors.debug.text).bold('[DEBUG]'), this.format(message), ...optionalParams)
  }

  public custom(color: keyof typeof chalk, prefix: string, message: any, ...optionalParams: any[]): void {
    if (!this.isEnabled) return
    const colorFn = chalk[color] as ((text: string) => string) | undefined
    if (colorFn) {
      console.log(colorFn(prefix), this.format(message), ...optionalParams)
    } else {
      console.log(prefix, this.format(message), ...optionalParams)
    }
  }

  public multiColor(parts: Array<{ text: string; color: keyof typeof chalk }>): void {
    if (!this.isEnabled) return

    const output = parts.map(({ text, color }) => {
      const colorFn = chalk[color] as ((text: string) => string) | undefined
      return colorFn ? colorFn(text) : text
    })

    console.log(...output)
  }
}

const logger = new Logger()
export default logger
