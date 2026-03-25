import TimerClient from '../../components/TimerClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TimerPage({ params }: Props) {
  const { id } = await params;
  return <TimerClient routineId={id} />;
}
