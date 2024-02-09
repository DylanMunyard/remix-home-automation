import {useRouteError} from "react-router";
import {useNavigation} from "@remix-run/react";
import {Spinner} from "flowbite-react";

export default function ErrorBoundary() {
  const error = useRouteError() as Error;
  const navigation = useNavigation();
  console.log(`Error: ${error}`);
  return (
    <section>

      <div className="py-8 px-4 mx-auto max-w-screen-xl text-center lg:py-16">
        <h1
          className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-white md:text-5xl lg:text-6xl dark:text-white">;_;</h1>
        <p className="mb-8 text-lg font-normal text-gray-100 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
          Something clearly went wrong
        </p>
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0">
          <a href={"/"}
             className="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-white rounded-lg bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-900">
            {navigation.state === "idle" ? (
              <>
                <span>Try Again</span>
                <svg className="w-3.5 h-3.5 ms-2 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                     fill="none" viewBox="0 0 14 10">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M1 5h12m0 0L9 1m4 4L9 9"/>
                </svg>
              </>
            ) : (
              <>
                <Spinner aria-label="Spinner button example"
                         size="sm"/>
                <span className="pl-3 text-gray-500 dark:text-gray-200">Reloading...</span>
              </>
            )}
          </a>
        </div>

        <div
          className="my-10 mx-auto p-5 flex items-center max-w-[300px] mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
          role="alert">
          <svg className="flex-shrink-0 inline w-4 h-4 me-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
               fill="currentColor" viewBox="0 0 20 20">
            <path
              d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
          </svg>
          <span className="sr-only">Error details</span>
          <div>
            {error.toString()}
          </div>
        </div>
      </div>
    </section>

  );
}