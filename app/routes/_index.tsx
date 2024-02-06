import {redirect,Link} from "@remix-run/react";

export const loader = () => {
  throw redirect('/lights');
}

export default function Index() {
  return (<></>);
}