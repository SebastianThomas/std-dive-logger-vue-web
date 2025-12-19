import { useRouter } from "next/navigation";
type diveSite = {
    name: string;
    latitude: number;
    longitude: number;
}
type Step3Props = {
    prevStep: () => void;
    data: {
        diveNumber?: number;
        diveName?: string;
        diveSite?: diveSite;
        diveBuddies?: string[];
        files?: File[];
    };
    submitData: () => void;
};

export default function CreateDiveStep3Page({ prevStep, data, submitData }: Step3Props) {
    const router = useRouter();

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">Step 3: Review & Submit</h2>

            <div className="mb-4 space-y-2">
                <p>
                    <strong>Dive Number:</strong> {data.diveNumber ?? "-"}
                </p>
                <p>
                    <strong>Dive Name:</strong> {data.diveName ?? "-"}
                </p>
                <p>
                    <strong>Location:</strong>{" "}
                    {data.diveSite
                        ? `${data.diveSite.name} (${data.diveSite.latitude.toFixed(5)}, ${data.diveSite.longitude.toFixed(5)})`
                        : "-"}
                </p>
                <p>
                    <strong>Buddies:</strong>{" "}
                    {data.diveBuddies && data.diveBuddies.length > 0
                        ? data.diveBuddies.join(", ")
                        : "-"}
                </p>
                <div>
                    <strong>Files Uploaded:</strong>
                    {data.files && data.files.length > 0 ? (
                        <ul className="ml-4 list-disc">
                            {data.files.map((file, idx) => (
                                <li key={idx}>{file.name}</li>
                            ))}
                        </ul>
                    ) : (
                        <span> -</span>
                    )}
                </div>
            </div>

            <div className="flex justify-between mt-6">
                <button
                    type="button"
                    onClick={prevStep}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
                >
                    Back
                </button>

                <button
                    type="button"
                    onClick={submitData}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                >
                    Submit Dive
                </button>

                <button
                    type="button"
                    onClick={() => router.push("/Dive/upload")}
                    className="bg-red-500 text-white px-4 py-2 rounded"
                >
                    Quit
                </button>
            </div>
        </div>
    );
}
