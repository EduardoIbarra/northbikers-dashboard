import Layout from '../layouts/centered'
import CenteredForm from '../layouts/centered-form'
import {useState} from "react";
import TextInput from "../components/input";
import Button from "../components/button";
import {getSupabase} from "../utils/supabase";
import {setLoggedUser} from "../utils";
import {useRouter} from "next/router";
import Spinner from "../components/spinner";

const LoginPage = () => {
    const supabase = getSupabase();
    const [data, onSubmit] = useState({email: '', password: ''})
    const [isLoading, setLoading] = useState(false);

    const isDisabled = !data?.email || !data?.password || isLoading
    const router = useRouter()

    const handleChange = (key, value) => {
        onSubmit({
            ...data,
            [key]: value
        })
    }


    const handleSubmit = async () => {
        setLoading(true)

        try {
            const response = await supabase.auth.signIn(data)
            if (!response.error) {
                try {
                    const {data} = await supabase.from(`profiles`).select('*').eq('id', response?.user.id);
                    const user = data ? data[0]: null
                    if (user?.isAdmin) {
                        setLoggedUser(data[0])
                        router.push('/')
                    }else{
                        alert('No cuentas con los permisos para acceder');
                    }

                    console.log(data);
                    setLoading(false)
                } catch (e) {
                    console.log("Error", e);
                    alert('Ocurrió un error, por favor verifique sus credenciales e inténtelo de nuevo');
                }


            } else {
                setLoading(false)
                const error = response?.error?.message;
                switch (error) {
                    case 'Invalid login credentials':
                        alert(`Correo o contraseña inválidos. Favor de intentar nuevamente.`);
                        break;
                    default:
                        break;
                }
            }

        } catch (e) {
            console.log("Error", e);
            setLoading(false)
            alert('Ocurrió un error, por favor verifique sus credenciales e inténtelo de nuevo');
        }
    }

    return (
        <Layout>
            <CenteredForm
                title="Login"
                subtitle="Ingresa correo y contraseña para ingresar">
                <div className="flex flex-col">
                    <TextInput label={'Email'} type='email' value={data?.email} onChange={(e) => handleChange('email', e)}/>
                    <TextInput label={'Contraseña'} type='password' value={data?.password} onChange={(e) => handleChange('password', e)}/>
                    <br/>
                </div>
                <div className='text-right'>
                    <Button className='w-28' disabled={isDisabled} onClick={handleSubmit}>
                        {isLoading ? <Spinner size={16}/> : 'Login'}
                    </Button>
                </div>
            </CenteredForm>
        </Layout>
    )
}

export default LoginPage
