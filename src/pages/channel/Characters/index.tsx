import React, {
  useCallback,
  useState,
  useEffect,
  useContext,
  ChangeEvent,
} from 'react';
import { IconButton } from '@material-ui/core';
import { Formik, Form } from 'formik';
import { Modal, Fade, Backdrop } from '@material-ui/core';

import { FaCheckCircle } from 'react-icons/fa';
import { HiMail } from 'react-icons/hi';

// Context
import { ErrorContext } from '../../../context/ErrorContext';
import { useSendMail } from '../../../context/SendMailContext';

// Services
import { api } from '../../../services/api';

// Components
import Loading from '../../../components/Loading';
import ModalChannel from '../../../components/ModalChannel';
import SendMail from '../../../components/SendMail';

// styles
import {
  CssTextField,
  CssTooltip,
  CssPagination,
  CssModalStyles,
} from '../../../styles/globalMaterialUi';
import './styles.scss';
import '../../../styles/global.scss';

interface IComicSummary {
  resourceURI: string; // The path to the individual character resource.,
  name: string; // The full name of the character.,
}

interface IComicList {
  available: number; // The number of total available characters in this list. Will always be greater than or equal to the "returned" value.,
  returned: number; //  The number of characters returned in this collection (up to 20).,
  collectionURI: string; //  The path to the full list of characters in this collection.,
  items: IComicSummary[]; // The list of returned characters in this collection.
}

interface IImage {
  path: string; // The directory path of to the image.,
  extension: string; // The file extension for the image.
}

interface ICharacter {
  id: number; // The unique ID of the comic resource.,
  name: string; // The canonical title of the comic.,
  description: string; // The preferred description of the comic.,
  modified: Date; // The date the resource was most recently modified.,
  resourceURI: string; // The canonical URL identifier for this resource.,
  // urls (Array[Url], optional): A set of public web site URLs for the resource.,
  // series (SeriesSummary, optional): A summary representation of the series to which this comic belongs.,
  // variants (Array[ComicSummary], optional): A list of variant issues for this comic (includes the "original" issue if the current issue is a variant).,
  // collections (Array[ComicSummary], optional): A list of collections which include this comic (will generally be empty if the comic's format is a collection).,
  // collectedIssues (Array[ComicSummary], optional): A list of issues collected in this comic (will generally be empty for periodical formats such as "comic" or "magazine").,
  // dates (Array[ComicDate], optional): A list of key dates for this comic.,
  // prices (Array[ComicPrice], optional): A list of prices for this comic.,
  thumbnail: IImage; // The representative image for this comic.,
  images: IImage[]; // A list of promotional images associated with this comic.,
  // creators (CreatorList, optional): A resource list containing the creators associated with this comic.,
  comics: IComicList; // A resource list containing the characters which appear in this comic.,
  // stories (StoryList, optional): A resource list containing the stories which appear in this comic.,
  // events (EventList, optional): A resource list containing the events in which this comic appears.
  active: boolean;
}

interface ICharacterDataContainer {
  offset: number;
  limit: number;
  total: number;
  count: number;
  results: ICharacter[];
}

interface ICharacterDataWrapper {
  code: number; // The HTTP status code of the returned result.,
  status: string; // A string description of the call status.,
  copyright: string; // The copyright notice for the returned result.,
  attributionText: string; // The attribution notice for this result. Please display either this notice or the contents of the attributionHTML field on all screens which contain data from the Marvel Comics API.,
  attributionHTML: string; // An HTML representation of the attribution notice for this result. Please display either this notice or the contents of the attributionText field on all screens which contain data from the Marvel Comics API.,
  data: ICharacterDataContainer; // The results returned by the call.,
  etag: string; // A digest value of the content returned by the call.
}

interface IEmailSelect {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  modified: Date;
  pageCount: number;
}

interface IParamsModal {
  multiple: boolean;
  channel: string;
  id: number;
  title: string;
  description: string;
  modified: Date;
  pageCount: number;
  thumbnail: string;
  image: string;
  nameChannel: string;
  name: string[];
  active: boolean;
}

interface IParamTypes {
  channel: string;
}

const Characters: React.FC<IParamTypes> = ({ channel }) => {
  const classesModal = CssModalStyles();

  // Context
  const { ErrorMessage } = useContext(ErrorContext);
  const { funcOpenModalMailChannel, openModalMailChannel } = useSendMail();

  // State
  const [loading, setLoading] = useState(false);
  const [dataModalMail, setDataModalMail] = useState<IParamsModal>(
    {} as IParamsModal,
  );
  const [openModal, setOpenModal] = useState(false);
  const [dataModal, setDataModal] = useState<IParamsModal>({} as IParamsModal);
  const [list, setList] = useState<ICharacterDataWrapper>(
    {} as ICharacterDataWrapper,
  );
  const [text, setText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('');

  useEffect(() => {
    async function loadList() {
      try {
        // Get local storage id selected
        setLoading(true);
        const channelId = localStorage.getItem(
          `@TestSoftDesign:${channel || 'comics'}`,
        );

        let dataChannelId: IEmailSelect[] = [];

        if (channelId) {
          dataChannelId = JSON.parse(channelId);
        }

        // Get channel api
        const paramsObj = {
          orderBy: `${order}${orderBy}`,
          limit: 20,
          offset: (page - 1) * 20,
        };

        let paramsSearchText = {};
        if (searchText) {
          paramsSearchText = {
            nameStartsWith: searchText,
          };
        }

        const params = Object.assign(paramsObj, paramsSearchText);

        const response = await api.get<ICharacterDataWrapper>(channel, {
          params,
        });

        setList({
          ...response.data,
          data: {
            ...response.data.data,
            results: response.data.data.results.map(r => ({
              ...r,
              active: Boolean(dataChannelId.find(id => Number(id.id) === r.id)),
            })),
          },
        });
      } catch (err) {
        ErrorMessage(err);
      } finally {
        setLoading(false);
      }
    }

    loadList();
  }, [ErrorMessage, channel, page, order, orderBy, searchText]);

  const handleChangePage = useCallback(
    (event: ChangeEvent<unknown>, value: number) => {
      setPage(value);
    },
    [],
  );

  const handleSetLocalStorage = useCallback(
    (
      id: number,
      title: string,
      description: string,
      thumbnail: string,
      modified: Date,
      pageCount: number,
    ) => {
      const channelId = localStorage.getItem(
        `@TestSoftDesign:${channel || 'comics'}`,
      );

      if (channelId) {
        const dataChannelId: IEmailSelect[] = JSON.parse(channelId);

        const existData = dataChannelId.filter(r => r.id === String(id));

        if (existData.length) {
          const dataNewChannelId: IEmailSelect[] = dataChannelId.filter(r =>
            String(id).indexOf(r.id),
          );

          localStorage.removeItem(`@TestSoftDesign:${channel || 'comics'}`);
          localStorage.setItem(
            `@TestSoftDesign:${channel || 'comics'}`,
            JSON.stringify(dataNewChannelId),
          );

          // state list manipulation;
          const findIndex = list.data.results.findIndex(r => r.id === id);

          list.data.results[findIndex].active = false;

          const data: ICharacterDataWrapper = {
            ...list,
            data: {
              ...list.data,
              results: list.data.results.map(r => ({ ...r })),
            },
          };

          setList(data);
        } else {
          dataChannelId.push({
            id: String(id),
            title,
            description,
            thumbnail,
            modified,
            pageCount,
          });

          localStorage.setItem(
            `@TestSoftDesign:${channel || 'comics'}`,
            JSON.stringify(dataChannelId),
          );

          // state list manipulation;
          const findIndex = list.data.results.findIndex(r => r.id === id);

          list.data.results[findIndex].active = true;

          const data: ICharacterDataWrapper = {
            ...list,
            data: {
              ...list.data,
              results: list.data.results.map(r => ({ ...r })),
            },
          };

          setList(data);
        }
      } else {
        const dataChannelId: IEmailSelect[] = [
          {
            id: String(id),
            title,
            description,
            thumbnail,
            modified,
            pageCount,
          },
        ];

        localStorage.setItem(
          `@TestSoftDesign:${channel || 'comics'}`,
          JSON.stringify(dataChannelId),
        );

        // state list manipulation;
        const findIndex = list.data.results.findIndex(r => r.id === id);

        list.data.results[findIndex].active = true;

        const data: ICharacterDataWrapper = {
          ...list,
          data: {
            ...list.data,
            results: list.data.results.map(r => ({ ...r })),
          },
        };

        setList(data);
      }
    },
    [channel, list],
  );

  const handleChangeOrder = useCallback(async (value: string) => {
    setOrder(value);
  }, []);

  const handleChangeOrderBy = useCallback(async (value: string) => {
    setOrderBy(value);
  }, []);

  const handleChangeSearch = useCallback(async (e: string) => {
    setText(e);
  }, []);

  const handleSearch = useCallback(
    async (e: any) => {
      if (e.key === 'Enter') {
        setPage(1);
        setSearchText(text);
      }
    },
    [text],
  );

  const handleOpenModal = useCallback(
    (
      id: number,
      title: string,
      description: string,
      modified: Date,
      pageCount: number,
      thumbnail: string,
      image: string,
      nameChannel: string,
      name: IComicSummary[],
      active: boolean,
    ) => {
      setDataModal({
        multiple: false,
        channel: channel || 'comics',
        id,
        title,
        description,
        modified,
        pageCount,
        thumbnail,
        image,
        nameChannel,
        name: name.map(r => r.name),
        active,
      });
      setOpenModal(true);
    },
    [channel],
  );

  const handleCloseModal = useCallback(() => {
    setOpenModal(false);
  }, []);

  const handleOpenModalMail = useCallback(
    (
      id: number,
      title: string,
      description: string,
      modified: Date,
      pageCount: number,
      thumbnail: string,
      image: string,
      nameChannel: string,
      name: IComicSummary[],
      active: boolean,
    ) => {
      setDataModalMail({
        multiple: false,
        channel: channel || 'comics',
        id,
        title,
        description,
        modified,
        pageCount,
        thumbnail,
        image,
        nameChannel,
        name: name.map(r => r.name),
        active,
      });

      funcOpenModalMailChannel(true);
    },
    [channel, funcOpenModalMailChannel],
  );

  return (
    <div className="content">
      <Modal
        aria-labelledby="transition-modal-title"
        aria-describedby="transition-modal-description"
        className={classesModal.modal}
        open={openModal}
        onClose={handleCloseModal}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={openModal}>
          <div className={classesModal.paper}>
            <ModalChannel data={dataModal} />
          </div>
        </Fade>
      </Modal>

      <Modal
        aria-labelledby="transition-modal-title"
        aria-describedby="transition-modal-description"
        className={classesModal.modal}
        open={openModalMailChannel}
        onClose={() => funcOpenModalMailChannel(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={openModalMailChannel}>
          <div className={classesModal.paper}>
            <SendMail data={dataModalMail} />
          </div>
        </Fade>
      </Modal>

      <div className="title-form">
        <div>
          <h1 className="global-title-h1">Personagens</h1>
        </div>
        <div>
          <Formik
            initialValues={{
              search_name: '',
              order_by: '',
              order: '',
            }}
            onSubmit={async () => {
              // onsubmit;
            }}
          >
            {({ values, handleChange, handleBlur, handleSubmit }) => (
              <Form onSubmit={handleSubmit}>
                <ul className="form">
                  <li>
                    <CssTextField
                      id="input-search-name"
                      label="Pesquisar personagens"
                      variant="outlined"
                      name="search_name"
                      value={values.search_name}
                      autoComplete="search_name"
                      margin="dense"
                      onChange={e => {
                        handleChange(e);
                        handleChangeSearch(e.target.value);
                      }}
                      onBlur={handleBlur}
                      onKeyPress={handleSearch}
                    />
                  </li>
                  <li>
                    <CssTextField
                      id="select-order-by"
                      name="order_by"
                      select
                      label="Ordenar por"
                      value={values.order_by}
                      onChange={e => {
                        handleChange(e);
                        handleChangeOrderBy(e.target.value);
                      }}
                      onBlur={handleBlur}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      SelectProps={{
                        native: true,
                      }}
                      margin="dense"
                      variant="outlined"
                    >
                      <option value="name">Nome</option>
                      <option value="modified">Modificado em</option>
                    </CssTextField>
                  </li>
                  <li>
                    <CssTextField
                      id="select-order"
                      name="order"
                      select
                      label="Ordem"
                      value={values.order}
                      onChange={e => {
                        handleChange(e);
                        handleChangeOrder(e.target.value);
                      }}
                      onBlur={handleBlur}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      SelectProps={{
                        native: true,
                      }}
                      margin="dense"
                      variant="outlined"
                    >
                      <option value="">Ascendente</option>
                      <option value="-">Decrescente</option>
                    </CssTextField>
                  </li>
                </ul>
              </Form>
            )}
          </Formik>
        </div>
      </div>

      {loading ? (
        <>
          <Loading />
        </>
      ) : (
        <>
          <ul className="channel-list">
            {list.data &&
              list.data.results.map(r => (
                <li className="channel-list-li" key={r.id}>
                  <img
                    src={`${r.thumbnail.path}/landscape_xlarge.${r.thumbnail.extension}`}
                    alt={r.name}
                    aria-hidden="true"
                    onClick={() =>
                      handleOpenModal(
                        r.id,
                        r.name,
                        r.description,
                        r.modified,
                        0,
                        `${r.thumbnail.path}/landscape_xlarge.${r.thumbnail.extension}`,
                        `${r.thumbnail.path}/landscape_incredible.${r.thumbnail.extension}`,
                        r.comics.items.length ? 'Histórias em Quadrinhos' : '',
                        r.comics.items.length ? r.comics.items : [],
                        r.active,
                      )
                    }
                  />
                  <div className="channel-box-info">
                    <p
                      className="global-paragraph"
                      aria-hidden="true"
                      onClick={() =>
                        handleOpenModal(
                          r.id,
                          r.name,
                          r.description,
                          r.modified,
                          0,
                          `${r.thumbnail.path}/landscape_xlarge.${r.thumbnail.extension}`,
                          `${r.thumbnail.path}/landscape_incredible.${r.thumbnail.extension}`,
                          r.comics.items.length
                            ? 'Histórias em Quadrinhos'
                            : '',
                          r.comics.items.length ? r.comics.items : [],
                          r.active,
                        )
                      }
                    >
                      {r.name}
                    </p>
                    <div className="channel-box-icon">
                      <CssTooltip title="SELECIONE PARA ENVIO EMAIL">
                        <IconButton
                          size="small"
                          aria-label="SELECIONE PARA ENVIO EMAIL"
                          onClick={() =>
                            handleSetLocalStorage(
                              r.id,
                              r.name,
                              r.description,
                              `${r.thumbnail.path}/landscape_xlarge.${r.thumbnail.extension}`,
                              r.modified,
                              0,
                            )
                          }
                        >
                          <FaCheckCircle
                            className={`channel-icon ${
                              r.active
                                ? 'channel-icon-check-active'
                                : 'channel-icon-check'
                            }`}
                            size="30"
                          />
                        </IconButton>
                      </CssTooltip>

                      <CssTooltip title="ENVIAR E-MAIL">
                        <IconButton
                          size="small"
                          aria-label="ENVIAR E-MAIL"
                          onClick={() =>
                            handleOpenModalMail(
                              r.id,
                              r.name,
                              r.description,
                              r.modified,
                              0,
                              `${r.thumbnail.path}/landscape_xlarge.${r.thumbnail.extension}`,
                              `${r.thumbnail.path}/landscape_incredible.${r.thumbnail.extension}`,
                              r.comics.items.length ? 'Personagens' : '',
                              r.comics.items.length ? r.comics.items : [],
                              r.active,
                            )
                          }
                        >
                          <HiMail
                            className="channel-icon channel-icon-mail"
                            size="40"
                          />
                        </IconButton>
                      </CssTooltip>
                    </div>
                  </div>
                </li>
              ))}
          </ul>

          {list.data ? (
            <div className="pagination">
              <CssPagination
                count={Math.ceil(list.data.total / 20)}
                variant="outlined"
                shape="rounded"
                page={page}
                onChange={handleChangePage}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default Characters;
