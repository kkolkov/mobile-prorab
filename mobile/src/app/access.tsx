import {Redirect,useLocalSearchParams} from 'expo-router';
export default function Access(){
 const {next}=useLocalSearchParams<{next?:string}>();
 const step=Math.max(1,Math.min(6,Number(next)||1));
 return <Redirect href={next?`/wizard/${step}`:'/'} />;
}
