import Section from "../section";
import {Timeline} from "../timelines";

const UpcomingRentals = () => {

    const items = [
        {
            "title": "Nola Prince",
            "sentence": "5 Days - from January 11 2022 to January 11 2022",
            "subtitle": "35 USD"
        },
        {
            "title": "Tonya Wong",
            "sentence": "5 Days - from January 11 2022 to January 11 2022",
            "subtitle": "35 USD"
        },
        {
            "title": "Krista Fletcher",
            "sentence": "1 Days - from January 11 2022 to January 11 2022",
            "subtitle": "35 USD"
        },
        {
            "title": "Jewell Hester",
            "sentence": "5 Days - from January 11 2022 to January 11 2022",
            "subtitle": "35 USD"
        },
        {
            "title": "Lindsay Dominguez",
            "sentence": "1 Days - from January 11 2022 to January 11 2022",
            "subtitle": "15 USD"
        },
        {
            "title": "Klein Garza",
            "sentence": "1 Days - from January 11 2022 to January 11 2022",
            "subtitle": "15 USD"
        },
        {
            "title": "Austin Carrillo",
            "sentence": "5 Days - from January 11 2022 to January 11 2022",
            "subtitle": "15 USD"
        },
        {
            "title": "Denise Buchanan",
            "sentence": "1 Days - from January 11 2022 to January 11 2022",
            "subtitle": "15 USD"
        },
        {
            "title": "Lizzie Cohen",
            "sentence": "1 Days - from January 11 2022 to January 11 2022",
            "subtitle": "35 USD"
        },
        {
            "title": "Ericka Roberson",
            "sentence": "1 Days - from January 11 2022 to January 11 2022",
            "subtitle": "15 USD"
        },
        {
            "title": "Annmarie Downs",
            "sentence": "1 Days - from January 11 2022 to January 11 2022",
            "subtitle": "35 USD"
        },
        {
            "title": "Shaffer Rice",
            "sentence": "1 Days - from January 11 2022 to January 11 2022",
            "subtitle": "35 USD"
        },
        {
            "title": "Tommie Harvey",
            "sentence": "1 Days - from January 11 2022 to January 11 2022",
            "subtitle": "35 USD"
        },
        {
            "title": "Roman Pierce",
            "sentence": "1 Days - from January 11 2022 to January 11 2022",
            "subtitle": "35 USD"
        },
        {
            "title": "Briggs Nolan",
            "sentence": "1 Days - from January 11 2022 to January 11 2022",
            "subtitle": "15 USD"
        },
        {
            "title": "Rowe Hahn",
            "sentence": "1 Days - from January 11 2022 to January 11 2022",
            "subtitle": "15 USD"
        },
        {
            "title": "Alma Peck",
            "sentence": "1 Days - from January 11 2022 to January 11 2022",
            "subtitle": "35 USD"
        },
        {
            "title": "Maureen Cabrera",
            "sentence": "1 Days - from January 11 2022 to January 11 2022",
            "subtitle": "35 USD"
        },
        {
            "title": "Melisa Alexander",
            "sentence": "5 Days - from January 11 2022 to January 11 2022",
            "subtitle": "15 USD"
        },
        {
            "title": "Christian Salazar",
            "sentence": "5 Days - from January 11 2022 to January 11 2022",
            "subtitle": "35 USD"
        }
    ]


    return (
        <Section
            title="Upcoming"
            description='Rentals'>
            <div className="flex flex-row w-full">
                <Timeline items={items}/>
            </div>
        </Section>
    )
}

export default UpcomingRentals