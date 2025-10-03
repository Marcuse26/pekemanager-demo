import { useEffect, useRef } from 'react';
import type { ChartType, ChartData, ChartOptions } from 'chart.js';
import Chart from 'chart.js/auto';
import { styles } from '../../styles';

const ChartComponent = ({ type, data, options }: { type: ChartType; data: ChartData; options: ChartOptions }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!chartRef.current) return;
        const chart = new Chart(chartRef.current, { type, data, options });
        return () => chart.destroy();
    }, [type, data, options]);
    return <div style={styles.chartContainer}><canvas ref={chartRef}></canvas></div>;
};

export default ChartComponent;