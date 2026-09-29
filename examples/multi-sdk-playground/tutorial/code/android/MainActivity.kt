package com.example.displaymap

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import com.arcgismaps.ApiKey
import com.arcgismaps.ArcGISEnvironment
import com.arcgismaps.mapping.ArcGISMap
import com.arcgismaps.mapping.BasemapStyle
import com.arcgismaps.toolkit.geoviewcompose.MapView

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // #region api-key
        ArcGISEnvironment.apiKey = ApiKey.create("YOUR_ACCESS_TOKEN") // @var accessToken
        // #endregion api-key

        // #region map
        setContent {
            MapView(
                modifier = Modifier.fillMaxSize(),
                arcGISMap = ArcGISMap(BasemapStyle.ArcGISTopographic),
            )
        }
        // #endregion map
    }
}
