import {random} from "../../functions/numbers";
import {getColor} from "../../functions/colors";
import {Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,} from 'recharts'
import Section from "../section";

const CustomTooltip = ({active, payload, label}) => {
    if (active) {
        let {name, lowest, highest} = {...payload[0].payload}
        return (
            <div className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white shadow-lg rounded-lg p-2 text-xs">
                <div className="font-bold">{name}</div>
                <div>
                    <span className="font-bold">Lowest:</span>{' '}
                    <span className="font-normal">{lowest} USD</span>
                </div>
                <div>
                    <span className="font-bold">Highest:</span>{' '}
                    <span className="font-normal">{highest} USD</span>
                </div>
            </div>
        )
    }
    return null
}


const PriceCharts = () => {
    let colors = [
        {dataKey: 'lowest', fill: getColor('bg-blue-200')},
        {dataKey: 'highest', fill: getColor('bg-blue-600')}
    ]
    const labels = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
    ]
    const data = Array.from(Array(12).keys()).map(i => {
        return {
            name: labels[i],
            lowest: random(15, 21),
            highest: random(21,40)
        }
    })


    return (
        <div className="flex flex-col w-full">
            <div className="w-full">
                <Section
                    title="Average price"
                    description="This year">
                    <div className="flex flex-row w-full">
                        <div style={{width: '100%', height: 240}}>
                            <ResponsiveContainer>
                                <BarChart
                                    data={data}
                                    margin={{
                                        top: 10,
                                        right: 10,
                                        left: 10,
                                        bottom: 10
                                    }}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false}/>
                                    <YAxis axisLine={false} tickLine={false} width={30}/>
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}}/>
                                    {colors.map((color, i) => (
                                        <Bar
                                            key={i}
                                            barSize={10}
                                            //stackId="sales"
                                            dataKey={color.dataKey}
                                            fill={color.fill}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </Section>
            </div>
        </div>

    )
}

export default PriceCharts