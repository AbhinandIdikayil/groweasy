import { GoogleGenAI } from '@google/genai';
import { CRMRecord } from '../interfaces/CRMRecord';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({});

export async function mapToCRMFormat(records: any[]): Promise<CRMRecord[]> {
  const tempFilePath = path.join(process.cwd(), `batch_${Date.now()}.csv`);
  
  if (records.length === 0) return [];
  const headers = Object.keys(records[0]).join(',');
  const csvContent = [headers, ...records.map(r => Object.values(r).join(','))].join('\n');
  fs.writeFileSync(tempFilePath, csvContent);

  try {
    const file = await ai.files.upload({
      file: tempFilePath,
      config: { displayName: 'CRM Batch Data', mimeType: 'text/csv' }
    });

    const fileName = file.name!;
    let getFile = await ai.files.get({ name: fileName });
    while (getFile.state === 'PROCESSING') {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      getFile = await ai.files.get({ name: fileName });
    }

    if (getFile.state === 'FAILED') {
      throw new Error('File processing failed.');
    }

    const prompt = `
      You are a data extraction assistant for a CRM. Map the provided CSV data records into the following JSON format.
      Fields: created_at, name, email, country_code, mobile_without_country_code, company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description.
      
      Constraints:
      1. crm_status must be one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE.
      2. data_source must be one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots. If not match, empty string.
      3. created_at must be valid JS date string.
      4. If multiple email/mobile exist, use the first and move others to crm_note.
      5. Map EVERY row in the input CSV. The returned JSON array MUST have the exact same number of items as the data rows in the CSV. Do not skip any rows.
      Return ONLY a JSON array of objects.
    `;

    const interaction = await ai.interactions.create({
      model: 'gemini-3.5-flash',
      input: [
        { type: "document", uri: file.uri, mime_type: file.mimeType || 'text/csv' },
        { type: "text", text: prompt }
      ],
    });

    const text = interaction.output_text || '';
    const jsonString = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    return JSON.parse(jsonString);
  } finally {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
}

