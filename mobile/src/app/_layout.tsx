import {AuthProvider,useAuth} from '../auth/AuthProvider';
import {AuthScreen} from '../auth/AuthScreen';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Screen, Body, Button } from '../components/ui';
export function ErrorBoundary({retry}:ErrorBoundaryProps) {
  return <SafeAreaProvider><Screen title="Не удалось открыть экран"><Body>Попробуйте загрузить его ещё раз.</Body><Button label="Повторить" onPress={retry}/></Screen></SafeAreaProvider>;
}
function Content(){
 const auth=useAuth();
 if(!auth.ready)return <Screen title="Мобильный прораб"><Body>Загрузка…</Body></Screen>;
 if(auth.error)return <Screen title="Не удалось подключиться"><Body>{auth.error}</Body><Button label="Повторить" onPress={auth.retry}/></Screen>;
 if(!auth.user)return <AuthScreen/>;
 return <Stack screenOptions={{headerShown:false,gestureEnabled:false,contentStyle:{backgroundColor:'#f6f6f3'}}}/>;
}
export default function Layout() {
  return <SafeAreaProvider><StatusBar style="dark"/><AuthProvider><Content/></AuthProvider></SafeAreaProvider>;
}
