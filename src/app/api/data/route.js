import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data.json');

export async function GET() {
  try {
    const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
    const data = JSON.parse(fileContent);
    return Response.json(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return Response.json({ error: 'Data file not found' }, { status: 404 });
    }
    return Response.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
