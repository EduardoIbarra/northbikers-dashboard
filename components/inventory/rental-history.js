import Section from "../section";
import React, {useMemo} from "react";
import Datatable from "../datatable";

const RentalHistory = () => {

    const columns = useMemo(
        () => [
            {
                Header: 'User ID',
                accessor: 'id'
            },
            {
                Header: 'Name',
                accessor: 'name'
            },
            {
                Header: 'Email',
                accessor: 'email'
            },
            {
                Header: 'Date Start',
                accessor: 'date_start',
            },
            {
                Header: 'Date End',
                accessor: 'date_end',
            },
            {
                Header: 'Fees',
                accessor: 'fees',
                Cell: props => <span>{props.value} USD</span>
            },
            {
                Header: 'Total',
                accessor: 'total',
                Cell: props => <span>{props.value} USD</span>
            }
        ],
        []
    )

    const data = [
        {
            "id": "61dd1699ad692f7a01378b3e",
            "name": "Rodriquez Vargas",
            "email": "rodriquezvargas@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 5,
            "total": 15
        },
        {
            "id": "61dd1699eccba1d1ebe7fd52",
            "name": "Erna Maxwell",
            "email": "ernamaxwell@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 5,
            "total": 15
        },
        {
            "id": "61dd1699f431818ed4e056de",
            "name": "Brewer Howard",
            "email": "brewerhoward@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 5,
            "total": 35
        },
        {
            "id": "61dd1699e9e8c9c49f4ca4d3",
            "name": "Heather Dunn",
            "email": "heatherdunn@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 0,
            "total": 35
        },
        {
            "id": "61dd1699d6d3e4e9fdacdc12",
            "name": "Solis Brewer",
            "email": "solisbrewer@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 0,
            "total": 15
        },
        {
            "id": "61dd16999773e905d7d5699e",
            "name": "Sherman Andrews",
            "email": "shermanandrews@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 0,
            "total": 35
        },
        {
            "id": "61dd1699eb9dc39438d4667f",
            "name": "Palmer Wiggins",
            "email": "palmerwiggins@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 0,
            "total": 15
        },
        {
            "id": "61dd16994150daeacc42d808",
            "name": "Amber Stephens",
            "email": "amberstephens@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 0,
            "total": 35
        },
        {
            "id": "61dd169963876fe36664c175",
            "name": "Bush West",
            "email": "bushwest@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 0,
            "total": 15
        },
        {
            "id": "61dd1699374e27c607cfdcb8",
            "name": "Vivian Booth",
            "email": "vivianbooth@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 0,
            "total": 15
        },
        {
            "id": "61dd1699609870cf816acb76",
            "name": "Stuart Hinton",
            "email": "stuarthinton@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 5,
            "total": 15
        },
        {
            "id": "61dd169905eac7c2c2489773",
            "name": "Lucas Hansen",
            "email": "lucashansen@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 5,
            "total": 15
        },
        {
            "id": "61dd1699f0ae6198f0819e44",
            "name": "Trisha Reynolds",
            "email": "trishareynolds@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 0,
            "total": 15
        },
        {
            "id": "61dd1699676a5a7dd2034f8b",
            "name": "Byrd Burke",
            "email": "byrdburke@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 0,
            "total": 15
        },
        {
            "id": "61dd16998d89d1940f3ce507",
            "name": "Jody Ross",
            "email": "jodyross@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 0,
            "total": 35
        },
        {
            "id": "61dd16993076d20714180562",
            "name": "Queen Mccarthy",
            "email": "queenmccarthy@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 0,
            "total": 15
        },
        {
            "id": "61dd1699a8dfe01694eb588d",
            "name": "Cecilia Huffman",
            "email": "ceciliahuffman@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 5,
            "total": 15
        },
        {
            "id": "61dd1699ec0023dd0260c6c4",
            "name": "Wilson Obrien",
            "email": "wilsonobrien@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 5,
            "total": 15
        },
        {
            "id": "61dd16991d11c54d5853ce66",
            "name": "Maricela Poole",
            "email": "maricelapoole@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 0,
            "total": 35
        },
        {
            "id": "61dd1699dde0f870be639b0f",
            "name": "Guerra Avery",
            "email": "guerraavery@intergeek.com",
            "date_start": "January 10 2022",
            "date_end": "January 10 2022",
            "fees": 0,
            "total": 35
        }
    ]

    return (
        <div className='my-3'>
            <Section
                title="History"
                description="Rentals">
                <Datatable columns={columns} data={data}/>
            </Section>
        </div>

    )
}

export default RentalHistory