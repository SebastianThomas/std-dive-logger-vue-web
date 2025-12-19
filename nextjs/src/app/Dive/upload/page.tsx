"use client";
import CreateDiveSite from "@/app/diveSite/create/page";
import { BasicLayout } from "@/app/helper/basic_layout";
import useApi from "@/hooks/useApi";
import "@fortawesome/fontawesome-free/css/all.css";
import { useRef, useState } from "react";
export default function UploadDivePage() {
  const { postWithToken } = useApi();
  const [file, setFile] = useState<File | null>(null);
  const [diveNumber, setDiveNumber] = useState<number | undefined>();
  const [identifier, setIdentifier] = useState("");
  const [siteId, setSiteId] = useState<number | undefined>();
  const [status, setStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");

    if (!file) {
      setStatus("Please select a file.");
      return;
    }

    try {
      const formData = new FormData();
      const body = {
        diveNumber: diveNumber ?? 1,
        diveIdentifier: identifier,
        diveSiteId: siteId ?? 0,
      };
      const bodyBlob = new Blob([JSON.stringify(body)], {
        type: "application/json",
      });
      formData.append("uploadBody", bodyBlob);
      formData.append("file", file);
      const res = await postWithToken("/v1/dives/upload", formData, {}, null);
      console.log(res.data);
      setStatus("Upload complete!");
    } catch (err) {
      console.error(err);
      setStatus("Error: " + (err as Error).message);
    }
  }

  return (
    <BasicLayout page_name="">
      <style>
        {`
        /* Hide number input arrows (Chrome, Safari, Edge) */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        /* Hide number arrows (Firefox) */
        input[type=number] {
          -moz-appearance: textfield;
        }
        `}
      </style>
      <main>
        <div className="bg-sky-100 text-black flex w-screen h-[calc(100vh-70px)]">
          <div className="w-full h-full flex justify-center items-center">
            <article>
              <header>
                <h1 className="text-black text-[40px] font-bold">
                  Upload a Dive
                </h1>
              </header>

              <main>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Dive Number */}
                  <div className="flex flex-col rounded-lg">
                    <label>Dive Number</label>
                    <input
                      type="number"
                      className="pl-3 rounded-lg"
                      placeholder="Enter dive number"
                      value={diveNumber ?? ""}
                      onChange={(e) => setDiveNumber(Number(e.target.value))}
                      required
                    />
                  </div>

                  {/* Identifier */}
                  <div className="flex flex-col rounded-lg">
                    <label>Dive Name</label>
                    <input
                      type="text"
                      className="pl-3 rounded-lg"
                      placeholder="Enter Name"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </div>

                  {/* Dive Site ID */}
                  <div className="flex flex-col rounded-lg">
                    <label>Dive Site ID</label>
                    <div className="flex items-center gap-2 mb-2">
                      <CreateDiveSite
                        onCreated={(site) => {
                          setSiteId(site.id);
                        }}
                      />
                    </div>
                    <input
                      type="number"
                      className="pl-3 rounded-lg"
                      placeholder="Enter dive site"
                      value={siteId ?? ""}
                      onChange={(e) => setSiteId(Number(e.target.value))}
                    />
                  </div>

                  {/* File Input */}
                  <div className="flex flex-col gap-1">
                    <label className="font-medium">Dive File</label>

                    <div
                      className="border-2 border-dashed border-sky-300 bg-sky-50 rounded-2xl 
               p-6 text-center cursor-pointer shadow-sm transition 
               hover:bg-sky-100 hover:border-sky-400"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (
                          e.dataTransfer.files &&
                          e.dataTransfer.files.length > 0
                        ) {
                          const f = e.dataTransfer.files[0];
                          setFile(f);
                        }
                      }}
                    >
                      <div className="text-sky-500 text-4xl mb-2">
                        <i className="fas fa-cloud-upload-alt"></i>
                      </div>

                      <p className="text-gray-700">
                        {file ? (
                          <span className="font-semibold">{file.name}</span>
                        ) : (
                          <>
                            <span className="font-semibold">
                              Click to upload
                            </span>{" "}
                            or drag & drop
                          </>
                        )}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        Supported file types: Any
                      </p>
                    </div>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={(e) => {
                        setFile(e.target.files?.[0] || null);
                      }}
                      required
                    />
                  </div>

                  {/* Submit */}
                  <div>
                    <input
                      className="text-black bg-sky-300 rounded-lg pl-2 pr-2 cursor-pointer"
                      type="submit"
                      value="Upload"
                    />
                  </div>

                  {/* Status */}
                  {status && <p>{status}</p>}
                </form>
              </main>
            </article>
          </div>
        </div>
      </main>
    </BasicLayout>
  );
}
