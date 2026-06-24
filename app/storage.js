'use strict';

const { DefaultAzureCredential } = require('@azure/identity');
const { BlobServiceClient } = require('@azure/storage-blob');

const account = process.env.STORAGE_ACCOUNT;
const containerName = process.env.BLOB_CONTAINER || 'materiais';

const credential = new DefaultAzureCredential();
const serviceClient = new BlobServiceClient(
  `https://${account}.blob.core.windows.net`,
  credential
);
const containerClient = serviceClient.getContainerClient(containerName);

async function listMateriais() {
  const materiais = [];
  for await (const blob of containerClient.listBlobsFlat()) {
    const bytes = blob.properties.contentLength || 0;
    materiais.push({
      name: blob.name,
      sizeKB: bytes ? Math.max(1, Math.round(bytes / 1024)) : null,
    });
  }
  materiais.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return materiais;
}

async function downloadMaterial(blobName) {
  const blobClient = containerClient.getBlobClient(blobName);
  const props = await blobClient.getProperties();
  const download = await blobClient.download();
  return {
    stream: download.readableStreamBody,
    contentType: props.contentType || 'application/octet-stream',
    contentLength: props.contentLength,
  };
}

module.exports = { listMateriais, downloadMaterial, containerName };
