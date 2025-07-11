import { getHost } from 'config';
import { usePerson } from 'hooks';
import { useHistory } from 'react-router-dom';
import { useStores } from 'store';

//TODO: mv into utils
const host = getHost();
function makeQR(pubkey: string) {
  return `sphinx.chat://?action=person&host=${host}&pubkey=${pubkey}`;
}

export const useUserInfo = () => {
  const { main, ui, modals } = useStores();
  const history = useHistory();
  const personId = ui.selectedPerson;
  const { canEdit, person } = usePerson(Number(personId));
  const { img, owner_alias, owner_pubkey } = person || {};

  function goBack() {
    ui.setSelectingPerson(0);
    const path = localStorage.getItem('key');
    if (path) {
      ui.setSearchText('');
      history.replace(path);
    } else {
      history.replace('/');
    }
  }
  const qrString = makeQR(owner_pubkey || '');

  const defaultPic = '/static/person_placeholder.png';
  const userImg = img || defaultPic;

  function logout() {
    ui.setEditMe(false);
    console.log('logging out!');
    ui.setMeInfo(null);
    main.getPeople({ resetPage: true });
    main.setLnToken('');
    history.push('/');
  }

  const onEdit = () => {
    modals.setUserEditModal(true);
  };

  return {
    canEdit,
    goBack,
    userImg,
    owner_alias,
    logout,
    person,
    qrString,
    onEdit
  };
};
