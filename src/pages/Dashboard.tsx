import { PieChart } from "react-minimal-pie-chart";
export default function Dashboard() {
  return (
    // TODO: Add a Pie chart and sortable list for websites with most time.
    // grabs the data from local storage.
    <div className="w-full h-dvh">
      <h1>Dashboard</h1>
      <div className="flex justify-left h-48">
        <PieChart
          data={[
            { title: "One", value: 10, color: "#E38627" },
            { title: "Two", value: 15, color: "#C13C37" },
            { title: "Three", value: 20, color: "#6A2135" },
          ]}
        />
      </div>
    </div>
  );
}
