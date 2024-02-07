import {ActionFunctionArgs, json, MetaFunction, TypedResponse} from "@remix-run/node";
import {Link, Outlet, useActionData, useFetcher, useLoaderData} from "@remix-run/react";
import {
  List,
  RangeSlider,
  Sidebar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow, Toast,
  ToggleSwitch
} from 'flowbite-react';
import {
  Light,
  getHome,
  Zone,
  GroupedLight,
  getGroupedLight,
  updateGroupedLight, HueError
} from "~/api/HueApi";
import React, {useState} from "react";
import HueErrors from "~/components/HueErrors";

export const meta: MetaFunction = () => {
  return [
    { title: "Home Life" },
    { name: "description", content: "Welcome to your smart home" },
  ];
};

export async function loader() : Promise<TypedResponse<{ lights: Light[], zones: Zone[], groups: GroupedLight[] }>> {
  const lights = await getHome();
  return json(lights);
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

const distributeLights = (zones: Zone[], lights: Light[], groups: GroupedLight[]) => {
  return zones.map(zone => ({
      ...zone,
      group: groups.find((group) => group.id === groupId(zone)),
      lights: lights.filter(light => zone.children.find(c => c.rid == light.id) !== undefined)
  }));
}

const groupId = (zone: Zone): string => {
  if (!zone.services) return "";
  const gId = zone.services.find((x) => x.rtype === "grouped_light");
  return gId?.rid ?? "";
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const zonesWithLights = distributeLights(data.zones, data.lights, data.groups);
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
      <div className="mx-auto flex flex-row">
        <Outlet />

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
          <HueErrors errors={errors} />

          {zonesWithLights.map((zone) => (
            <div key={zone.id}>
              <div className="flex items-center justify-between my-5">
                <div className="flex items-center space-x-3 ">
                  {zone.group ? (
                    <fetcher.Form method="post">
                      <input type="hidden" name="gid" value={zone.group.id}/>
                      <input type="hidden" name="intent" value="toggle"/>
                      <ToggleSwitch
                        checked={zone.group.on.on}
                        onChange={() => { }}
                        onClick={(event) => fetcher.submit(event.currentTarget.form)}/>
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
                      <RangeSlider name="brightness" sizing="xl"
                                   min={1} max={100}
                                   defaultValue={zone.group.dimming?.brightness}
                                   onClick={(event) => fetcher.submit(event.currentTarget.form)}></RangeSlider>
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
          ))}
        </div>

      </div>
  );
}
