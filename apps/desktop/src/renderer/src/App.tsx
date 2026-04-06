import React from "react";
import ThreePanelLayout from "./components/Layout/ThreePanelLayout";
import ConfigPanel from "./components/LeftPanel/ConfigPanel";
import CenterPanel from "./components/CenterPanel/CenterPanel";
import RightPanel from "./components/RightPanel/RightPanel";

export default function App(): React.JSX.Element {
  return (
    <ThreePanelLayout
      left={<ConfigPanel />}
      center={<CenterPanel />}
      right={<RightPanel />}
    />
  );
}
