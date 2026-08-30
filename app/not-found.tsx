import { ErrorScreen } from "@/components/error-screen";

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="Lost in the void"
      body="That page is not on the star chart. Check the link, or head back and pick a destination."
    />
  );
}
