import { WorkigomTool, ToolContext, ToolResult } from '../tool.types';

export interface SendNotificationInput {
  taxpayerId: string;
  message: string;
}

export const sendNotificationTool: WorkigomTool<SendNotificationInput, { delivered: boolean, timestamp: string }> = {
  name: 'send_notification',
  description: 'Belirtilen mükellefe uygulama içi bildirim veya SMS gönderir.',
  risk: 'external_action',
  inputSchema: null,
  
  async execute(context: ToolContext, input: SendNotificationInput): Promise<ToolResult<{ delivered: boolean, timestamp: string }>> {
    try {
      console.log('=> [MOCK API CALL] Mevcut Notification Servisi Tetiklendi');
      console.log('=> [PAYLOAD] Alici ID: ' + input.taxpayerId);
      console.log('=> [PAYLOAD] Mesaj: "' + input.message + '"');
      
      return {
        success: true,
        data: {
          delivered: true,
          timestamp: new Date().toISOString()
        }
      };
    } catch (err: any) {
      return { success: false, error: { code: 'NOTIF_ERROR', message: err.message } };
    }
  }
};
