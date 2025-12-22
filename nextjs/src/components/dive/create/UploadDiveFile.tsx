"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Step2Props = {
    nextStep: () => void;
    prevStep: () => void;
    data: { files: File[] }; // files is non-optional
    setData: (updater: (prev: { files: File[] }) => { files: File[] }) => void;
    mode?: "create" | "edit";
};

export default function UploadDiveFile({ nextStep, prevStep, data, setData, mode }: Readonly<Step2Props>) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Local UI state: array of files
    const [files, setFiles] = useState<File[]>(data.files || []);

    const handleAddFiles = (newFiles: FileList | File[]) => {
        const fileArray = Array.from(newFiles);
        const updatedFiles = [...files, ...fileArray];
        setFiles(updatedFiles);
        setData(() => ({ files: updatedFiles })); // persist to parent
    };

    const handleRemoveFile = (index: number) => {
        const updatedFiles = files.filter((_, i) => i !== index);
        setFiles(updatedFiles);
        setData(() => ({ files: updatedFiles }));
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">Upload Dive Files</h2>

            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    className="border-2 border-dashed border-sky-300 bg-sky-50 rounded-2xl 
                     p-6 text-center cursor-pointer shadow-sm transition 
                     hover:bg-sky-100 hover:border-sky-400 py-10"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleAddFiles(e.dataTransfer.files);
                        }
                    }}
                >
                    <div className="text-sky-500 text-4xl mb-2">
                        <i className="fas fa-cloud-upload-alt"></i>
                    </div>
                    <p className="text-gray-700">
                        {files.length > 0 ? (
                            <>Selected {files.length} file{files.length > 1 ? "s" : ""}</>
                        ) : (
                            <>
                                <span className="font-semibold">Click to upload</span> or drag & drop
                            </>
                        )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Supported file types: Any</p>
                </button>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={(e) => e.target.files && handleAddFiles(e.target.files)}
                />

                {files.length > 0 && (
                    <ul className="mt-2">
                        {files.map((file, index) => (
                            <li key={file.size + file.name} className="flex justify-between items-center py-1 px-2 border rounded mb-1">
                                <span className="truncate">{file.name}</span>
                                <button
                                    type="button"
                                    className="text-red-500 px-2 py-1 text-sm"
                                    onClick={() => handleRemoveFile(index)}
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex justify-between mt-6">
                {mode === "edit" && (
                    <>
                        <button
                            type="button"
                            onClick={prevStep}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
                        >
                            Back
                        </button>

                        <button
                            type="button"
                            onClick={nextStep}
                            className="bg-green-600 text-white px-4 py-2 rounded"
                        >
                            Submit Changes
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push('/Dive/upload')}
                            className="bg-red-500 text-white px-4 py-2 rounded"
                        >
                            Quit
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}