import { Linking } from 'react-native';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
  type DocumentPickerResponse,
} from '@react-native-documents/picker';
import { getAuth } from '@react-native-firebase/auth';
import { deleteObject, getDownloadURL, getStorage, putFile, ref } from '@react-native-firebase/storage';

const MAX_ID_PROOF_BYTES = 10 * 1024 * 1024;

export type PickedIdProof = {
  localUri: string;
  mimeType: string;
  name: string;
  size: number | null;
};

const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'id-proof';

const localCopyFor = async (file: DocumentPickerResponse) => {
  const [copy] = await keepLocalCopy({
    destination: 'cachesDirectory',
    files: [{ fileName: safeFileName(file.name ?? 'id-proof'), uri: file.uri }],
  });
  if (copy.status === 'error') throw new Error(copy.copyError || 'Could not read the selected file.');
  return copy.localUri;
};

export const idProofService = {
  async pick(): Promise<PickedIdProof | null> {
    try {
      const [file] = await pick({ allowMultiSelection: false, mode: 'import', type: [types.images, types.pdf] });
      if (!file.hasRequestedType) throw new Error('Choose an image or PDF file.');
      if (file.size !== null && file.size > MAX_ID_PROOF_BYTES) throw new Error('ID proof must be 10 MB or smaller.');
      return {
        localUri: await localCopyFor(file),
        mimeType: file.type ?? 'application/octet-stream',
        name: file.name ?? 'id-proof',
        size: file.size,
      };
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return null;
      throw error;
    }
  },

  async upload(tenantId: string, file: PickedIdProof) {
    const ownerId = getAuth().currentUser?.uid;
    if (!ownerId) throw new Error('Connect your Firebase account before uploading an ID proof.');
    const storagePath = `users/${ownerId}/tenant-id-proofs/${tenantId}/${Date.now()}-${safeFileName(file.name)}`;
    const storageRef = ref(getStorage(), storagePath);
    await putFile(storageRef, file.localUri, { contentType: file.mimeType });
    return { mimeType: file.mimeType, name: file.name, storagePath };
  },

  async remove(storagePath: string) {
    await deleteObject(ref(getStorage(), storagePath));
  },

  async open(storagePath: string) {
    const downloadUrl = await getDownloadURL(ref(getStorage(), storagePath));
    await Linking.openURL(downloadUrl);
  },
};
