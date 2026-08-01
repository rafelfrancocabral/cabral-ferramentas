// ============================================================
// Cloudflare R2 - Configuracao do cliente (Cabral)
// ============================================================
// 1. R2_WORKER_URL   -> URL do Worker criado no painel da Cloudflare
//    (ex: 'https://cabral-r2-uploader.<seu-subdominio>.workers.dev')
// 2. R2_PUBLIC_BASE_URL -> URL publica do bucket R2
//    (r2.dev: 'https://pub-xxxxxxxxxxxxxxxxxxxx.r2.dev' OU dominio proprio)
// 3. R2_WORKER_SECRET -> mesma senha de UPLOAD_SECRET configurada no Worker
//    (deixe '' se nao configurou UPLOAD_SECRET no Worker)
//
// IMPORTANTE: deixe tudo '' para o site continuar usando o Supabase Storage.
// ============================================================

const R2_WORKER_URL = 'https://cabral-r2-uploader.rafaelfrancocabral.workers.dev';
const R2_PUBLIC_BASE_URL = 'https://pub-86a2cc413c6b4677b366096c64c61169.r2.dev';
const R2_WORKER_SECRET = 'admincabral123';
