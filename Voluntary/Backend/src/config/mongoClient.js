const { MongoClient } = require("mongodb");

const keyVaultNamespace = "encryption.__keyVault";

const client = new MongoClient(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoEncryption: {
    keyVaultNamespace,
    kmsProviders: {
      azure: {
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
      },
    },
    extraOptions: {
      azureKeyVaultEndpoint: process.env.AZURE_KEY_VAULT_ENDPOINT.replace("https://", ""),
    },
  },
});

module.exports = client;
