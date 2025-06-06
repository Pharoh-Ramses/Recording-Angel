"use client";

import { IKImage, ImageKitProvider, IKUpload } from "imagekitio-next";
import config from "@/lib/config";
import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

const {
  env: {
    imagekit: { publicKey, urlEndpoint },
  },
} = config;

const authenticator = async () => {
  try {
    const response = await fetch(`${config.env.apiEndpoint}/api/auth/imagekit`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Request failed with status ${response.status}: ${errorText}`,
      );
    }
    const data = await response.json();
    const { signature, expire, token } = data;
    return { signature, expire, token };
  } catch (error: any) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

const ImageUpload = ({
  onFileChange,
}: {
  onFileChange: (filePath: string) => void;
}) => {
  const ikUploadRef = useRef(null);
  const [file, setFile] = useState<{ filePath: string } | null>(null);
  const onError = (error: any) => {
    console.log(error);
    toast.error("Error uploading image", {
      description: `${error.message}`,
    });
  };
  const onSuccess = (res: any) => {
    setFile(res);
    onFileChange(res.filePath);
    toast("Image Uploaded Successfully", {
      description: `${res.filePath} uploaded successfully`,
    });
  };
  return (
    <div>
      <ImageKitProvider
        publicKey={publicKey}
        urlEndpoint={urlEndpoint}
        authenticator={authenticator}
      >
        <IKUpload
          className="hidden"
          ref={ikUploadRef}
          onError={onError}
          onSuccess={onSuccess}
          fileName="image.png"
        />
        <button
          className="upload-btn"
          onClick={(e) => {
            e.preventDefault();
            if (ikUploadRef.current) {
              // @ts-ignore
              ikUploadRef.current?.click();
            }
          }}
        >
          <Image
            src="/icons/upload.svg"
            alt="upload"
            width={20}
            height={20}
            className="object-contain"
          />
          <p className="text-base text-light-100">Upload an image</p>
          {file && <p className="upload-filename">{file.filePath}</p>}
        </button>
        {file && (
          <IKImage
            alt={file.filePath}
            path={file.filePath}
            width={200}
            height={200}
          />
        )}
      </ImageKitProvider>
    </div>
  );
};

export default ImageUpload;
