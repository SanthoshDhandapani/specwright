import React from "react";
import ThreePanelLayout from "./components/Layout/ThreePanelLayout";
import ConfigPanel from "./components/LeftPanel/ConfigPanel";
import CenterPanel from "./components/CenterPanel/CenterPanel";
import RightPanel from "./components/RightPanel/RightPanel";
import { useConfigStore } from "./store/config.store";

export default function App(): React.JSX.Element {
  const projectState = useConfigStore((s) => s.projectState);

  return (
    <ThreePanelLayout
      left={<ConfigPanel />}
      center={<CenterPanel />}
      right={projectState === "ready" ? <RightPanel /> : undefined}
    />
  );
}
