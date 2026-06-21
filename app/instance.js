'use strict';

// Descobre QUAL instância respondeu (requisito do projeto).
// Consulta o Azure Instance Metadata Service (IMDS); em dev local cai no hostname.
// O valor é constante por instância, então cacheamos por processo — é justamente
// essa constância que prova o balanceamento quando o hostname alterna no navegador.

const os = require('os');

let cached = null;

async function getInstanceInfo() {
  if (cached) return cached;

  const info = { hostname: os.hostname(), name: null, vmId: null, location: null };

  try {
    const res = await fetch(
      'http://169.254.169.254/metadata/instance?api-version=2021-02-01',
      { headers: { Metadata: 'true' }, signal: AbortSignal.timeout(1500) }
    );
    if (res.ok) {
      const data = await res.json();
      const c = data.compute || {};
      info.name = c.name || null;
      info.vmId = c.vmId || null;
      info.location = c.location || null;
    }
  } catch (_) {
    // Fora do Azure (ex.: desenvolvimento local). Mantém apenas o hostname.
  }

  cached = info;
  return info;
}

module.exports = { getInstanceInfo };
