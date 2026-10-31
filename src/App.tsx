import { RouterProvider } from "react-router-dom";
import { StoreProvider } from "./features/store/StoreProvider";
import { router } from "./routes/router";

export default function App() {
  return (
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  );
}
