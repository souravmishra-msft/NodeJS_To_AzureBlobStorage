import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { EnvironmentCredential, ManagedIdentityCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

// Create __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// Middleware setup
app.use(cors());
app.use(express.static(path.join(__dirname, "public"))); // Static folder serving
app.set("view engine", "ejs");

// Azure Storage configuration
const storageAccountName = process.env.STORAGE_ACCOUNT_NAME;
const storageContainerName = process.env.STORAGE_CONTAINER_NAME;

// Credential handling logic
const getAzureCredential = () => {
  // Check if running in a local development environment
  const isLocal = process.env.NODE_ENV !== "production";

  if (isLocal) {
    console.log("Using EnvironmentCredential for local development");
    return new EnvironmentCredential();
  } else {
    try {
      console.log("Using ManagedIdentityCredential for Azure environment");
      return new ManagedIdentityCredential();
    } catch (error) {
      console.error("ManagedIdentityCredential unavailable, falling back to EnvironmentCredential");
      return new EnvironmentCredential();
    }
  }
};

const listBlobs = async () => {
  const credential = getAzureCredential();
  const blobServiceClient = new BlobServiceClient(`https://${storageAccountName}.blob.core.windows.net`, credential);

  console.log("Credential: ", credential);

  const containerClient = blobServiceClient.getContainerClient(storageContainerName);
  const blobsList = [];

  for await (const blob of containerClient.listBlobsFlat()) {
    console.log("Blob: ", blob);
    // Push an object with the name and properties to the array
    blobsList.push({
      name: blob.name,
      createdOn: blob.properties.createdOn,
      lastModified: blob.properties.lastModified,
    });
  }

  return blobsList;
};

// Simple route to test the server
app.get("/", async (req, res) => {
  try {
    const blobs = await listBlobs();
    res.render("index", { blobs });
  } catch (error) {
    console.error("Error listing blobs:", error.message);
    res.status(500).send("Error fetching blobs");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
