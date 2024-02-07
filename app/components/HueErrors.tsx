import {HiExclamation} from "react-icons/hi";
import {List, Toast} from "flowbite-react";
import React, {useState} from "react";
import {HueError} from "~/api/HueApi";

export default function HueErrors({ errors } : { errors: HueError[] }) {
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
          <List>
            {uiErrors.map((error, idx) => {
              return <List.Item key={idx}>{error.description}</List.Item>
            })}
          </List>
        </div>
        <Toast.Toggle onDismiss={() => setUiErrors([])} />
      </Toast>
    ) : null }
    </>
  )
}