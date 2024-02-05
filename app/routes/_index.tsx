import {json, MetaFunction, TypedResponse} from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {Sidebar, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow} from 'flowbite-react';
import {Light, getHome, Zone} from "~/api/HueApi"
import LightDetails from "~/routes/lights.$id.details";
import React, {useEffect, useState} from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "Home Life" },
    { name: "description", content: "Welcome to your smart home" },
  ];
};

export async function loader() : Promise<TypedResponse<{ lights: Light[], zones: Zone[] }>> {
  const lights = await getHome();
  return json(lights);
}

const distributeLights = (zones: Zone[], lights: Light[]) => {
  return zones.map(zone => ({
    ...zone,
    lights: lights.filter(light => zone.children.find(c => c.rid == light.id) !== undefined)
  }));
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const zonesWithLights = distributeLights(data.zones, data.lights);
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewLightId, setViewLightId] = useState<string | null>(null);

  function showLight(evt: React.MouseEvent<HTMLAnchorElement>, lightId: string) {
    evt.preventDefault();

    setSearchParams((params) => {
      params.set("lightId", lightId);
      return params;
    })
  }

  function hideLight() {
    setSearchParams((params) => {
      params.delete("lightId");
      return params;
    })
  }

  useEffect(() => {
    const lightId = searchParams.get("lightId");
    if (lightId) {
      setViewLightId(lightId);
    } else {
      setViewLightId(null);
    }
  }, [searchParams]);

  return (
      <div className="mx-auto flex flex-row">
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
            {zonesWithLights.map((zone) => (
            <div key={zone.id}>
              <h1 id={zone.id} className="my-5 text-4xl font-bold text-white">{zone.metadata?.name}</h1>

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
                                <a href={`/lights/${light.id}/details`}
                                   onClick={(evt) => showLight(evt, light.id)}
                                   className="hover:text-blue-600 dark:hover:text-blue-500 hover:underline hover:cursor-pointer">
                                  {light.metadata?.name}
                                </a>
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

        <LightDetails partialLight={ { id: viewLightId as string }} onClose={hideLight} />

      </div>
  );
}
