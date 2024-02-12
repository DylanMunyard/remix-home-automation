import {ActionFunctionArgs, defer, json, MetaFunction, TypedDeferredData} from "@remix-run/node";
import {Await, Link, Outlet, useAsyncValue, useFetcher, useLoaderData} from "@remix-run/react";
import ErrorComponent from "~/components/ErrorBoundary";
import {
  RangeSlider,
  Sidebar, Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  ToggleSwitch
} from 'flowbite-react';
import {
  Light,
  getHome,
  Zone,
  GroupedLight,
  getGroupedLight,
  updateGroupedLight, HueError
} from "~/api/HueApi.server";
import React, {Suspense, useState} from "react";
import HueErrorToast from "~/components/HueErrorToast";
import {HiOutlineHome} from "react-icons/hi2"

export const meta: MetaFunction = () => {
  return [
    { title: "Home Life" },
    { name: "description", content: "Welcome to your smart home" },
  ];
};

type ApiData = { errors: HueError[], lights: Light[], zones: Zone[], groups: GroupedLight[]  };

interface Model extends Zone {
  group: GroupedLight | undefined,
  lights: Light[];
}

export async function loader() : Promise<TypedDeferredData<{ data: Promise<ApiData> }>> {
  try {
    const lights = getHome();

    return defer({
      data: lights
    });
  } catch (ex) {
    console.error(ex);
    return defer({
      data: new Promise((resolve) => resolve({errors: [{ description: "A developer error 🔥 may have just happened" }], lights: [], zones: [], groups: []}))
    });
  }
}

export function ErrorBoundary() {
  return (
    <ErrorComponent />
  );
}

export const action = async ({
   request,
 }: ActionFunctionArgs) => {
  const body = await request.formData();
  const id = body.get("gid") as string;
  const brightness = body.get("brightness") as string;
  const { errors, data } = await getGroupedLight(id);

  if (errors.length) {
    return json({ errors });
  }

  const groupedLight : Partial<GroupedLight> = {
    id,
    on: data[0].on
  }

  switch (body.get("intent")) {
    case 'toggle': {
      if (groupedLight.on !== undefined) groupedLight.on.on = !groupedLight.on.on;
      const putResponse = await updateGroupedLight(groupedLight);
      if (!putResponse.errors.length) {
        await new Promise((resolve) => setTimeout( resolve, 2000));
      }
      return json({ errors: putResponse.errors });
    }
    case 'brightness': {
      groupedLight.on = { on: true };
      groupedLight.dimming = { brightness: parseFloat(brightness) };
      const putResponse = await updateGroupedLight(groupedLight);
      if (!putResponse.errors.length) {
        await new Promise((resolve) => setTimeout( resolve, 2000));
      }
      return json({ errors: putResponse.errors });
    }
  }

  return json({ errors: [{description: 'What are you trying to do?'}] });
};


const distributeLights = (data: ApiData) : Model[] => {
  return data.zones.map(zone => ({
      ...zone,
      group: data.groups.find((group) => group.id === groupId(zone)),
      lights: data.lights.filter(light => zone.children.find(c => c.rid == light.id) !== undefined)
  }));
}

const groupId = (zone: Zone): string => {
  if (!zone.services) return "";
  const gId = zone.services.find((x) => x.rtype === "grouped_light");
  return gId?.rid ?? "";
}

export default function Index() {
  const {data} = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [errors, setErrors] = useState<HueError[]>([]);

  React.useEffect(() => {
    if (fetcher.data?.errors.length) {
      setErrors(fetcher.data.errors.map((e) => ({
        description: `Hue error '${e.description}'`
      })));
    } else {
      setErrors([]);
    }
  }, [fetcher.data]);

  return (
      <div>
        <Outlet />

        <Suspense fallback={<LightsSkeleton />}>
          <Await resolve={data} errorElement={<HomeNoBueno />} >
            {(data) =>
            <div className="mx-auto flex flex-row">
              {data.zones.length === 0 ? (
                <HomeNoBueno />
              ) : (<>
              <Sidebar className="mx-6 sticky top-1/4" aria-label="Zones">
                <Sidebar.Items>
                  <Sidebar.ItemGroup>
                    <h2 className="font-bold text-xl leading-tight">Zones</h2>
                    {data.zones.map(zone =>
                      <Sidebar.Item href={`#${zone.id}`} key={zone.id}
                                    className="hover:text-blue-600 dark:hover:text-blue-500 hover:underline hover:cursor-pointer">
                        {zone.metadata?.name}
                      </Sidebar.Item>
                    )}
                  </Sidebar.ItemGroup>
                </Sidebar.Items>
              </Sidebar>

              <div className="mt-5 mb-20 w-3/5 relative overflow-x-auto shadow-md sm:rounded-lg">
                <HueErrorToast errors={errors} />

                {distributeLights(data).map((zone) => (
                  <div key={zone.id}>
                    <div className="flex items-center justify-between my-5">
                      <div className="flex items-center space-x-3 ">
                        {zone.group ? (
                          <fetcher.Form method="post">
                            <input type="hidden" name="gid" value={zone.group.id}/>
                            <input type="hidden" name="intent" value="toggle"/>
                            {fetcher.state == "idle" ? (
                                <ToggleSwitch
                                  checked={zone.group.on.on}
                                  onChange={() => { }}
                                  onClick={(event) => fetcher.submit(event.currentTarget.form)}/>
                              ) :
                              <Spinner color="success" aria-label="Success spinner example" />
                            }
                          </fetcher.Form>
                        ) : null }
                        <h1 id={zone.id} className="text-4xl font-bold text-white">
                          <div>{zone.metadata?.name}</div>
                        </h1>
                      </div>

                      {zone.group ? (
                        <div className="flex items-center space-x-3 ">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                               className="fill-slate-100" viewBox="0 0 16 16">
                            <path
                              d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/>
                          </svg>

                          <fetcher.Form method="post" className="mt-1">
                            <input type="hidden" name="gid" value={zone.group.id}/>
                            <input type="hidden" name="intent" value="brightness"/>
                            {fetcher.state == "idle" ? (
                                <RangeSlider name="brightness" sizing="xl"
                                             min={1} max={100}
                                             defaultValue={zone.group.dimming?.brightness}
                                             onClick={(event) => fetcher.submit(event.currentTarget.form)}></RangeSlider>
                              ) :
                              <Spinner color="success" aria-label="Success spinner example" />
                            }
                          </fetcher.Form>
                        </div>
                      ) : null }
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHead>
                          <TableHeadCell>Light</TableHeadCell>
                          <TableHeadCell>Status</TableHeadCell>
                        </TableHead>
                        <TableBody className="divide-y">
                          {zone.lights.map((light) =>
                            <TableRow key={light.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                              <TableCell
                                className="flex items-center px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                <div className="bg-green-500 w-10 h-10 rounded-full"/>
                                <div className="ps-3">
                                  <div className="text-base font-semibold">
                                    <Link key={light.id} to={`/lights/${light.id}`}
                                          className="hover:text-blue-600 dark:hover:text-blue-500 hover:underline hover:cursor-pointer">
                                      {light.metadata?.name}
                                    </Link>
                                  </div>
                                  <div className="font-normal text-gray-500">Hue filament bulb</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  {light.on.on ? (<>
                                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 me-2"></div>
                                    On
                                  </>) : (<>
                                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 me-2"></div>
                                    Off
                                  </>)}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))} {/* If any zones check */}
              </div>
              </>
              )} {/* API data promise resolved */}
            </div>
            }
          </Await>
        </Suspense>
      </div>
  );
}

function LightsSkeleton() {
  return (
    <div className="mx-auto flex flex-row">
      <SkeletonSidebar num_items={2} />

      <div className="mt-5 w-3/5 relative overflow-x-auto shadow-md sm:rounded-lg animate-pulse">
        <SkeletonHeader />

        <div className="overflow-x-auto">
          <SkeletonTable rows={6}/>
        </div>

        <SkeletonHeader />
        <div className="overflow-x-auto">
          <SkeletonTable rows={3}/>
        </div>
      </div>
    </div>
  )
}

function SkeletonHeader() {
  return (
    <div className="flex items-center justify-between my-5">
      <div className="flex items-center space-x-3 ">
        <div className="h-6 w-12 bg-gray-200 rounded-full dark:bg-gray-700"></div>
        <div className="h-6 bg-gray-200 rounded-full dark:bg-gray-700 w-48"></div>
      </div>
      <div className="flex items-center space-x-3 ">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
             className="fill-slate-100" viewBox="0 0 16 16">
          <path
            d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/>
        </svg>
        <div className="w-52 h-6 bg-gray-200 rounded-full dark:bg-gray-700"></div>
      </div>
    </div>
  )
}

function SkeletonSidebar({num_items}: { num_items: number }) {
  return (
    <Sidebar className="mx-6 sticky top-1/4 animate-pulse" aria-label="Zones">
      <Sidebar.Items>
        <Sidebar.ItemGroup>
          <h2 className="font-bold text-xl leading-tight">Zones</h2>
          <div role="status" className="max-w-sm animate-pulse">
            {Array.from({length: num_items}).map((_item, idx) => (
              <div key={idx} className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[128px] my-5"></div>
            ))}
          </div>
        </Sidebar.ItemGroup>
      </Sidebar.Items>
    </Sidebar>
  );
}

function SkeletonTable({rows}: { rows: number }) {
  return (
    <Table>
      <TableHead>
        <TableHeadCell>Light</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
      </TableHead>
      <TableBody className="divide-y">
        {Array.from({length: rows}).map((_item, idx) => (
          <TableRow key={idx} className="bg-white dark:border-gray-700 dark:bg-gray-800">
            <TableCell
              className="flex items-center px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
              <div className="bg-green-500 w-10 h-10 rounded-full"/>
              <div className="ps-3 w-full">
                <div className="h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-14 mb-2.5"></div>
                <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 w-20 mb-2.5"></div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-500 me-2"></div>
                <div className="h-2.5 w-4 rounded-full bg-gray-500 me-2"></div>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function HomeNoBueno() {
  const asyncValue = useAsyncValue() as ApiData;

  console.warn(asyncValue);

  return (
    <div className="mx-auto flex items-center justify-center h-screen">
      <section className="bg-white dark:bg-gray-500 max-w-[450px]">
        <div className="py-8 px-4 max-w-screen-xl text-center lg:py-8">
          <HiOutlineHome size={192} className="mx-auto block fill-green-300"/>
          <p className="text-lg font-normal text-gray-800 lg:text-xl dark:text-white">
            Looks like your home has no lights (or there was an error while connecting to the bridge)
          </p>
          {asyncValue.errors ?
            <div
              className="mt-5 flex text-left p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
              role="alert">
              <svg className="flex-shrink-0 inline w-4 h-4 me-3 mt-[2px]" aria-hidden="true"
                   xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
              </svg>
              <span className="sr-only">Hue Errors</span>
              <div>
                <span className="font-medium">Unable to load your lights because:</span>
                <ul className="space-y-4 mt-1.5 list-disc list-inside">
                  {asyncValue.errors.map((error, idx) => (
                    <li key={idx}>{error.description}</li>
                  ))}
                </ul>
              </div>
            </div> : null}
        </div>
      </section>
    </div>
  )
}