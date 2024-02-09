import {HiExclamation} from "react-icons/hi";
import {Toast} from "flowbite-react";
import React, {useState} from "react";
import {HueError} from "~/api/HueApi";

export default function HueErrorToast({ errors } : { errors: HueError[] }) {
  const [uiErrors, setUiErrors] = useState<HueError[]>([]);

  React.useEffect(() => {
    setUiErrors(errors);
  }, [errors]);

  return (
    <>
    {uiErrors.length ? (
      <Toast>
        <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-500 dark:bg-orange-700 dark:text-orange-200">
          <HiExclamation className="h-5 w-5" />
        </div>
        <div className="ml-3 text-sm font-normal">
            {uiErrors.map((error, idx) => {
              return <div key={idx}>{error.description}</div>
            })}
        </div>
        <Toast.Toggle onDismiss={() => setUiErrors([])} />
      </Toast>
    ) : null }
    </>
  )
}