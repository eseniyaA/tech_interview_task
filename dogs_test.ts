import axios from 'axios';

const DOG_API_BASE_URL = 'https://dog.ceo/api';
const YANDEX_DISK_API_BASE_URL = 'https://cloud-api.yandex.net/v1/disk/resources';

const YANDEX_API_TOKEN = process.env.YANDEX_DISK_API_TOKEN;

class YaUploader {
    async createFolder(path: string, token: string): Promise<void> {
        const urlCreate = `${YANDEX_DISK_API_BASE_URL}`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `OAuth ${token}`,
        };

        try {
            await axios.put(`${urlCreate}?path=${path}`, {}, { headers });
            console.log("Folder created");
        } catch (error) {
            console.error("Error creating folder: ", error);
            throw new Error("Failed to create folder");
        }
    }

    async uploadPhotosToYd(token: string, path: string, urlFile: string, name: string): Promise<void> {
        const urlUpload = `${YANDEX_DISK_API_BASE_URL}/upload`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `OAuth ${token}`,
        };
        const params = {
            path: `/${path}/${name}`,
            url: urlFile,
            overwrite: "true"
        };

        try {
            await axios.post(urlUpload, {}, { headers, params });
            console.log(`Uploaded: ${name}`);
        } catch (error) {
            console.error('Error uploading file: ', error);
            throw new Error(`Failed to upload image: ${name}`);
        }
    }
}

async function fetchSubBreeds(breed: string): Promise<string[]> {
    try {
        const response = await axios.get(`${DOG_API_BASE_URL}/breed/${breed}/list`);
        return response.data.message || [];
    } catch (error) {
        console.error(`Error fetching sub-breeds for ${breed}`, error);
        throw new Error(`Failed to fetch sub-breeds for breed: ${breed}`);
    }
}

async function fetchUrls(breed: string): Promise<string[]> {
    const subBreeds = await fetchSubBreeds(breed);
    let urls = [];

    if (subBreeds.length > 0) {
        for (const subBreed of subBreeds) {
            const response = await axios.get(`${DOG_API_BASE_URL}/breed/${breed}/${subBreed}/images/random`)
            urls.push(response.data.message);
        };
    } else {
        const response = await axios.get(`${DOG_API_BASE_URL}/breed/${breed}/images/random`)
        urls.push(response.data.message);
    }

    return urls;
}

async function uploadBreeds(breed: string): Promise<void> {
    const yandexClient = new YaUploader();

    await yandexClient.createFolder(`test_folder_${breed}`, YANDEX_API_TOKEN);
    const urls = await fetchUrls(breed);

    for (const [index, url] of urls.entries()) {
        await yandexClient.uploadPhotosToYd(YANDEX_API_TOKEN, `test_folder_${breed}`, url, `image_${index}.jpg`);
    }
}

async function checkFiles(breed: string): Promise<void> {
    try {
        const response = await axios.get(`${YANDEX_DISK_API_BASE_URL}?path=/test_folder_${breed}`);

        const items = response.data._embedded?.items || [];
        items.forEach(item => {
            if (item.type === 'file') {
                console.log(`File found: ${item.name}`);
            }
         });
    } catch (error) {
        console.error('Failed to get file: ', error);
    }
}

// Arrange
const breeds = ['doberman', 'bulldog', 'collie'];

for (const breed of breeds) {
    try {
        // Act
        await uploadBreeds(breed);

        // Assert
        await checkFiles(breed);

        console.log(`Test passed for breed: ${breed}`);
    } catch (error) {
        console.error(`Test failed for breed: ${breed}`);
        throw new Error(`Test failed for breed ${breed} with error: ${error}`);
    }
}
    
