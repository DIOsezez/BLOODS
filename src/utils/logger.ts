/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - YAPILANDIRILMIŞ LOG SİSTEMİ
 * Sıfır harici bağımlılık, %100 kesintisiz çalışma ve dayanıklılık.
 */
export class BotLogger {
  public static info(msg: string, ...args: any[]) {
    console.log(`[${new Date().toISOString()}] [INFO] [MTA-BOT] ${msg}`, ...args);
  }

  public static warn(msg: string, ...args: any[]) {
    console.warn(`[${new Date().toISOString()}] [WARN] [MTA-BOT] ${msg}`, ...args);
  }

  public static error(msg: string, err?: any) {
    console.error(`[${new Date().toISOString()}] [ERROR] [MTA-BOT] ${msg}`, err || '');
  }

  public static debug(msg: string, ...args: any[]) {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(`[${new Date().toISOString()}] [DEBUG] [MTA-BOT] ${msg}`, ...args);
    }
  }
}

export const logger = {
  info: (msg: string, ...args: any[]) => BotLogger.info(msg, ...args),
  warn: (msg: string, ...args: any[]) => BotLogger.warn(msg, ...args),
  error: (errOrMsg: any, msg?: string) => BotLogger.error(typeof errOrMsg === 'string' ? errOrMsg : msg || '', errOrMsg),
  debug: (msg: string, ...args: any[]) => BotLogger.debug(msg, ...args)
};
