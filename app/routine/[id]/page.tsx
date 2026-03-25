import RoutineEditor from '../../components/RoutineEditor';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditRoutinePage({ params }: Props) {
  const { id } = await params;
  return <RoutineEditor routineId={id} />;
}
