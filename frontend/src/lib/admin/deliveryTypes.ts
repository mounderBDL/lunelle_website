export type OfficeCommune = { id: number; name: string; active: boolean; hasOffice: boolean };

export type OfficeImportResult = {
  rows: number;
  withOffice: number;
  changed: number;
  ignoredRows: number;
  unknownIds: string[];
};

export type AdminSettings = {
  store_name: string;
  contact_phone: string;
  contact_email: string;  
  telegram_chat_id: string;
};

export type TelegramChat = { id: string; type: string | null; name: string | null };

export type TelegramTest = {
  tokenConfigured: boolean;
  chatIdConfigured: boolean;
  sent: boolean;
  message: string;
};