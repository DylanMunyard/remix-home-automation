import {useFetcher} from "@remix-run/react";
import {ActionFunctionArgs, json, LoaderFunctionArgs} from "@remix-run/node";
import {getLight, Light, updateLight} from "~/api/HueApi";
import {useEffect, useState} from "react";
import {Spinner, ToggleSwitch} from "flowbite-react";

export async function loader({
   params,
}: LoaderFunctionArgs) {
  const light = await getLight(params.id as string);
  return json(light);
}

export const action = async ({
 request,
}: ActionFunctionArgs) => {
  const body = await request.formData();
  const id = body.get("id") as string;
  const on = body.get("on") as string === "true";
  const putResponse = await updateLight({
    id,  on : { on }
  });
  return json({ errors: putResponse.errors });
};

export default function LightDetails({ partialLight } : { partialLight: Partial<Light> }) {
  const lightDetails = useFetcher<typeof loader>();
  const [showDetails, setShowDetails] = useState(false);
  const [on, setOn] = useState(false);
  const fetcher = useFetcher<typeof action>();

  function handleToggleSwitch(on: boolean) {
    const formData : FormData = new FormData();
    formData.append("id", partialLight.id as string);
    formData.append("on", String(on));
    fetcher.submit(
      formData,
      {
        action: `/lights/${partialLight.id}/details`,
        method: "post",
      }
    );
  }

  useEffect(() => {
    if (
      showDetails &&
      lightDetails.state === "idle" &&
      !lightDetails.data
    ) {
      lightDetails.load(`/lights/${partialLight.id}/details`);
    }
  }, [showDetails, lightDetails, partialLight.id]);

  useEffect(() => {
    if (lightDetails.data?.data.length) {
      setOn(lightDetails.data?.data[0].on.on);
    }
  }, [lightDetails, partialLight]);

  return (
    <div
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      <h2 className="font-bold text-xl leading-tight">{ partialLight.metadata?.name }</h2>
      {showDetails ? (
        lightDetails.state === "idle" && lightDetails.data?.data.length ? (
          <fetcher.Form method="post" action={`/lights/${partialLight}/details`}>
            <ToggleSwitch checked={on} onChange={(evt) => {
              setOn(evt.valueOf());
              handleToggleSwitch(evt.valueOf());
            }} />
          </fetcher.Form>
        ) : (
          <Spinner aria-label="I'm trying to fetch light details..." />
        )
      ) : null}
    </div>
  );
}
