using MapService.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MapService.Controllers
{
    public class TestController : ControllerBase
    {
        [Route("mapconfig/list")]
        [HttpGet]
        public List<string> GetConfigList() { 
            List<string> configList = new List<string>();
            configList.Add("map_1");
            configList.Add("nytt");
            configList.Add("oversiktsplan");
            configList.Add("oversiktsplan_OLD");

            return configList;
        }

        [Route("mapconfig/listimage")]
        [HttpGet]
        public List<string> GetListImage()
        {
            List<string> listImage = new List<string>();
            listImage.Add("geografiska_inriktningar_1.PNG");
            listImage.Add("geografiska_inriktningar_2.PNG");
            listImage.Add("geografiska_inriktningar_3.PNG");
            listImage.Add("geografiska_inriktningar_4.PNG");

            return listImage;
        }

        [Route("mapconfig/listaudio")]
        [HttpGet]
        public IEnumerable<ListAudio>  GetListAudio() {
            return Enumerable.Range(1, 5).Select(index => new ListAudio
            {
                audio = "mixkit-arcade-retro-game-over-213_ " + index + ".wav"
            })
            .ToArray();


        }

        [Route("mapconfig/listvideo")]
        [HttpGet]
        public ListVideo GetListVideo()
        {
            List<string> list = new List<string>();
            list.Add("file_example_OGG_480_1_7mg.ogg");
            list.Add("file_example_OGG_480_1_8mg.ogg");
            list.Add("file_example_OGG_480_1_9mg.ogg");
            list.Add("file_example_OGG_480_1_0mg.ogg");

            ListVideo listVideo = new ListVideo
            {
                listVideo = list
            };

            return listVideo;
        }
    }
}
