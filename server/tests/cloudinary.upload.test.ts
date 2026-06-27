import { uploadMedia } from '../src/services/storage/storage.service';

async function main() {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const stored = await uploadMedia(png, 'image', '.png');
  console.log('provider:', stored.provider);
  console.log('url starts with https:', stored.url.startsWith('https://'));
  console.log('url:', stored.url);
}
main().catch((e) => {
  console.error('FAIL:', e.message ?? e);
  process.exit(1);
});
