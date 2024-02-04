import {ActionFunctionArgs, json, LoaderFunctionArgs, MetaFunction} from "@remix-run/node";
import {getLight, HueError, Light, updateLight} from "~/api/HueApi";
import {useFetcher, useLoaderData, useActionData} from "@remix-run/react";
import {Alert, Button, Card, Label, List, RangeSlider, TextInput} from "flowbite-react";
import React, {useState} from "react";

export const loader = async ({
  params,
} : LoaderFunctionArgs) => {
  const light = await getLight(params.id as string);
  return json(light);
}

export const meta: MetaFunction = () => {
  return [
    { title: "Home Life" },
    { name: "description", content: "Welcome to your smart home" },
  ];
};

export const action = async ({
  request,
}: ActionFunctionArgs) => {
  const body = await request.formData();
  const id = body.get("id") as string;
  const brightness = body.get("brightness") as string;
  const { errors, data } = await getLight(id);

  if (errors.length) {
    return json({ errors });
  }

  const light : Partial<Light> = {
    id,
    on: data[0].on
  }

  switch (body.get("intent")) {
    case 'toggle': {
      if (light.on !== undefined) light.on.on = !light.on.on;
      const putResponse = await updateLight(light);
      return json({ errors: putResponse.errors });
    }
    case 'brightness': {
      light.on = { on: true };
      light.dimming = { brightness: parseFloat(brightness) };
      const putResponse = await updateLight(light);
      return json({ errors: putResponse.errors });
    }
  }

  return json({ errors: [{description: 'What are you trying to do?'}] });
}

export default function Index() {
  const { errors: loaderErrors, data } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [errors, setErrors] = useState<string[] | null>(null);

  React.useEffect(() => {
    if (fetcher.data?.errors.length) {
      setErrors(fetcher.data.errors.map((e) => e.description) as string[]);
    } else {
      setErrors(null);
    }
  }, [fetcher.data]);

  React.useEffect(() => {
    if (loaderErrors.length) {
      setErrors(loaderErrors.map((e) => e.description) as string[]);
    }
  }, [loaderErrors]);

  return (
    <div className="flex items-center h-screen justify-center w-full">
      <Card className="max-w-[480px]">
        <div className="flex flex-col items-center pb-10">
          {errors ? (
            <Alert color="failure">
              <List>
                {errors.map((error, index) => (
                  <List.Item key={index}>{error}</List.Item>
                ))}
              </List>
            </Alert>
          ) : null}
          {data.length > 0 ? (<>
            <div className="mb-1 rounded-full w-48 h-48 bg-green-500"></div>
            <h5 className="mb-1 text-xl font-medium text-gray-900 dark:text-white">{data[0].metadata?.name}</h5>
            <span className="text-sm text-gray-500 dark:text-gray-400">Downstairs, Office</span>
            <div className="mt-4 flex items-center space-x-3 lg:mt-6">
              <fetcher.Form method="post">
                <input type="hidden" name="id" value={data[0].id} />
                <input type="hidden" name="intent" value="toggle" />
                <Button type={"submit"} color="blue">{data[0].on?.on ?? false ? "Off" : "On"}</Button>
              </fetcher.Form>
              <div>
                <div className="mb-1 block">
                  <Label className="text-gray-900 dark:text-white" htmlFor="lg-range" value="Brightness"/>
                </div>

                <fetcher.Form method="post">
                  <input type="hidden" name="id" value={data[0].id}/>
                  <input type="hidden" name="intent" value="brightness"/>
                  <RangeSlider name="brightness" sizing="lg"
                               min={1} max={100}
                               defaultValue={data[0].dimming?.brightness}
                               onClick={(event) => fetcher.submit(event.currentTarget.form)}></RangeSlider>
                </fetcher.Form>
              </div>
            </div>
          </>) : null}
        </div>
      </Card>
    </div>
  )
}